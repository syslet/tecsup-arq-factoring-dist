import importlib.util
import base64
import hashlib
from pathlib import Path

import requests
from cryptography.fernet import Fernet


FRONTEND_APP = Path(__file__).parents[1] / "frontend_web" / "app.py"


def load_frontend_module(monkeypatch):
    monkeypatch.setenv("REGISTRO_APP_URL", "http://registro_app:5001")
    spec = importlib.util.spec_from_file_location("frontend_web_app", FRONTEND_APP)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_registrar_usuario_usa_registro_app(monkeypatch):
    module = load_frontend_module(monkeypatch)
    calls = []

    class Response:
        text = '{"status":"Usuario registrado"}'

        def raise_for_status(self):
            return None

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return Response()

    monkeypatch.setattr(module.requests, "post", fake_post)
    response = module.registrar_usuario_en_backend({"email": "ana@example.com"})

    assert response.text == '{"status":"Usuario registrado"}'
    assert calls == [
        (
            "http://registro_app:5001/registro/usuario",
            {"json": {"email": "ana@example.com"}, "timeout": 10},
        )
    ]


def test_registrar_usuario_propagates_error_del_servicio(monkeypatch):
    module = load_frontend_module(monkeypatch)

    def fake_post(url, **kwargs):
        raise requests.Timeout("registro_app no responde")

    monkeypatch.setattr(module.requests, "post", fake_post)

    try:
        module.registrar_usuario_en_backend({"email": "ana@example.com"})
    except requests.Timeout:
        pass
    else:
        raise AssertionError("Se esperaba propagar el error de conexión")


def test_api_registrar_usuario_cifra_clave_y_devuelve_qr(monkeypatch):
    module = load_frontend_module(monkeypatch)
    calls = []
    monkeypatch.setattr(module.pyotp, "random_base32", lambda: "JBSWY3DPEHPK3PXP")

    def fake_post_registro(path, payload):
        calls.append((path, payload))
        return {"id": 42}, None

    monkeypatch.setattr(module, "post_registro_app", fake_post_registro)
    with module.app.test_request_context(
        "/api/registro/usuario",
        method="POST",
        json={
            "email": "ana@example.com",
            "password": "Password!123",
            "full_name": "Ana Pérez",
            "dni": "12345678",
            "phone": "987654321",
        },
    ):
        response, status = module.api_registrar_usuario()

    assert status == 201
    assert response.json["user_id"] == 42
    assert response.json["totp_secret"] == "JBSWY3DPEHPK3PXP"
    assert response.json["qr_code"].startswith("data:image/png;base64,")
    path, user_payload = calls[0]
    encryption_key = base64.urlsafe_b64encode(
        hashlib.sha256(module.SECRET_KEY.encode("utf-8")).digest()
    )
    decrypted_password = Fernet(encryption_key).decrypt(
        user_payload["password_hash"].encode("ascii")
    ).decode("utf-8")
    assert path == "/registro/usuario"
    assert user_payload == {
        "email": "ana@example.com",
        "password_hash": user_payload["password_hash"],
        "full_name": "Ana Pérez",
        "dni": "12345678",
        "phone": "987654321",
        "verification_status": "JBSWY3DPEHPK3PXP",
    }
    assert decrypted_password == "Password!123"


def test_api_registrar_empresa_asocia_representante(monkeypatch):
    module = load_frontend_module(monkeypatch)
    calls = []

    def fake_post_registro(path, payload):
        calls.append((path, payload))
        return {"id": 17, "status": "Empresa registrada"}, None

    monkeypatch.setattr(module, "post_registro_app", fake_post_registro)
    payload = {
        "ruc": "20123456789",
        "business_name": "Empresa de Prueba S.A.C.",
        "legal_representative_user_id": 42,
        "bank_name": "BCP",
        "bank_account_number": "1234567890123",
        "cci": "20261234567890123001",
        "currency": "PEN",
    }
    with module.app.test_request_context("/api/registro/empresa", method="POST", json=payload):
        response, status = module.api_registrar_empresa()

    assert status == 201
    assert response.json == {"id": 17, "status": "Empresa registrada"}
    assert calls == [("/registro/empresa", payload)]
