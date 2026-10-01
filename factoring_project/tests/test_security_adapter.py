import base64
import hashlib
import uuid

import pyotp
from cryptography.fernet import Fernet

from security_adapter import security_service


def invoke_post(route, path, payload):
    with security_service.app.test_request_context(path, method="POST", json=payload):
        return route()


def encrypted_password(password, secret_key):
    key = base64.urlsafe_b64encode(hashlib.sha256(secret_key.encode("utf-8")).digest())
    return Fernet(key).encrypt(password.encode("utf-8")).decode("ascii")


def test_find_user_by_email_consulta_la_empresa_asociada(monkeypatch):
    row = (
        7,
        "ana@example.com",
        "encrypted-password",
        "Ana Pérez",
        "12345678",
        "987654321",
        "JBSWY3DPEHPK3PXP",
        12,
        "20123456789",
        "Empresa de Ana",
        "BCP",
        "001234567890",
        "00212345678901234567",
        "PEN",
    )

    class Cursor:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def execute(self, query, params):
            self.query = query
            self.params = params

        def fetchone(self):
            return row

    cursor = Cursor()

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def cursor(self):
            return cursor

    monkeypatch.setattr(
        security_service.psycopg2,
        "connect",
        lambda *_args, **_kwargs: Connection(),
    )

    user = security_service.find_user_by_email("ana@example.com")

    assert user == dict(zip(
        (
            "user_id",
            "email",
            "password_hash",
            "full_name",
            "dni",
            "phone",
            "verification_status",
            "company_id",
            "ruc",
            "business_name",
            "bank_name",
            "bank_account_number",
            "cci",
            "currency",
        ),
        row,
    ))
    assert "JOIN companies" in cursor.query
    assert "companies.legal_representative_user_id = users.id" in cursor.query
    assert cursor.params == ("ana@example.com",)


def test_validuser_retorna_perfil_si_credenciales_validas(monkeypatch):
    secret_key = "test-secret"
    monkeypatch.setattr(security_service, "SECRET_KEY", secret_key)
    monkeypatch.setattr(
        security_service,
        "find_user_by_email",
        lambda email: {
            "user_id": 7,
            "email": email,
            "password_hash": encrypted_password("Password!123", secret_key),
            "full_name": "Ana Pérez",
            "dni": "12345678",
            "phone": "987654321",
            "verification_status": "JBSWY3DPEHPK3PXP",
            "company_id": 12,
            "ruc": "20123456789",
            "business_name": "Empresa de Ana",
            "bank_name": "BCP",
            "bank_account_number": "001234567890",
            "cci": "00212345678901234567",
            "currency": "PEN",
        },
    )

    response, status = invoke_post(
        security_service.validuser,
        "/security/validuser",
        {"email": "ana@example.com", "password": "Password!123"},
    )

    assert status == 200
    assert response.get_json() == {
        "user_id": 7,
        "email": "ana@example.com",
        "full_name": "Ana Pérez",
        "dni": "12345678",
        "phone": "987654321",
        "verification_status": "JBSWY3DPEHPK3PXP",
        "company_id": 12,
        "ruc": "20123456789",
        "business_name": "Empresa de Ana",
        "bank_name": "BCP",
        "bank_account_number": "001234567890",
        "cci": "00212345678901234567",
        "currency": "PEN",
    }


def test_validuser_devuelve_404_si_clave_no_coincide(monkeypatch):
    secret_key = "test-secret"
    monkeypatch.setattr(security_service, "SECRET_KEY", secret_key)
    monkeypatch.setattr(
        security_service,
        "find_user_by_email",
        lambda email: {
            "user_id": 7,
            "email": email,
            "password_hash": encrypted_password("correct-password", secret_key),
            "full_name": "Ana Pérez",
            "dni": "12345678",
            "phone": "987654321",
            "verification_status": None,
            "company_id": 12,
            "ruc": "20123456789",
            "business_name": "Empresa de Ana",
        },
    )

    response, status = invoke_post(
        security_service.validuser,
        "/security/validuser",
        {"email": "ana@example.com", "password": "wrong-password"},
    )

    assert status == 404
    assert "Usuario no encontrado" in response.get_json()["error"]


def test_validemail_retorna_perfil_de_usuario(monkeypatch):
    user = {
        "user_id": 7,
        "email": "ana@example.com",
        "password_hash": "not-returned",
        "full_name": "Ana Pérez",
        "dni": "12345678",
        "phone": "987654321",
        "verification_status": "JBSWY3DPEHPK3PXP",
        "company_id": 12,
        "ruc": "20123456789",
        "business_name": "Empresa de Ana",
        "bank_name": "BCP",
        "bank_account_number": "001234567890",
        "cci": "00212345678901234567",
        "currency": "PEN",
    }
    monkeypatch.setattr(security_service, "find_user_by_email", lambda email: user)

    response, status = invoke_post(
        security_service.validemail,
        "/security/validemail",
        {"email": "ana@example.com"},
    )

    assert status == 200
    assert response.get_json() == {
        "user_id": 7,
        "email": "ana@example.com",
        "full_name": "Ana Pérez",
        "dni": "12345678",
        "phone": "987654321",
        "verification_status": "JBSWY3DPEHPK3PXP",
        "company_id": 12,
        "ruc": "20123456789",
        "business_name": "Empresa de Ana",
        "bank_name": "BCP",
        "bank_account_number": "001234567890",
        "cci": "00212345678901234567",
        "currency": "PEN",
    }


def test_validemail_devuelve_404_si_usuario_no_existe(monkeypatch):
    monkeypatch.setattr(security_service, "find_user_by_email", lambda email: None)

    response, status = invoke_post(
        security_service.validemail,
        "/security/validemail",
        {"email": "missing@example.com"},
    )

    assert status == 404
    assert response.get_json() == {"error": "Usuario no encontrado."}


def test_validotp_devuelve_guid_para_codigo_valido():
    secret = pyotp.random_base32()
    otp_code = pyotp.TOTP(secret).now()

    response, status = invoke_post(
        security_service.validotp,
        "/security/validotp",
        {"totp_secret": secret, "otp_code": otp_code},
    )

    body = response.get_json()
    assert status == 200
    assert body["message"] == "Código válido. Autenticación exitosa."
    assert str(uuid.UUID(body["guid"])) == body["guid"]


def test_validotp_rechaza_codigo_invalido():
    response, status = invoke_post(
        security_service.validotp,
        "/security/validotp",
        {"totp_secret": pyotp.random_base32(), "otp_code": "000000"},
    )

    assert status == 400
    assert response.get_json() == {"message": "Código inválido. Intente nuevamente."}
