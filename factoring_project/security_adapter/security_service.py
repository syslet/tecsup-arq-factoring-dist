import base64
import binascii
import hashlib
import hmac
import logging
import os
import uuid

import psycopg2
import pyotp
from cryptography.fernet import Fernet, InvalidToken
from flask import Flask, jsonify, request


app = Flask(__name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "")
REGISTRO_DATABASE_URL = os.environ.get(
    "REGISTRO_DATABASE_URL",
    "postgresql://factoring_user:factoring_pass@localhost:5433/registro_db",
)

PROFILE_FIELDS = (
    "user_id",
    "email",
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
)


def decrypt_password(encrypted_password: str) -> str | None:
    if not SECRET_KEY:
        raise RuntimeError("La variable SECRET_KEY es obligatoria para validar usuarios.")

    key = base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode("utf-8")).digest())
    try:
        return Fernet(key).decrypt(encrypted_password.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, UnicodeEncodeError):
        return None


def find_user_by_email(email: str) -> dict[str, str | int | None] | None:
    query = """
        SELECT
            users.id AS user_id,
            users.email,
            users.password_hash,
            users.full_name,
            users.dni,
            users.phone,
            users.verification_status,
            companies.id AS company_id,
            companies.ruc,
            companies.business_name,
            companies.bank_name,
            companies.bank_account_number,
            companies.cci,
            companies.currency
        FROM users
        JOIN companies
            ON companies.legal_representative_user_id = users.id
        WHERE users.email = %s
        LIMIT 1
    """
    with psycopg2.connect(REGISTRO_DATABASE_URL, connect_timeout=5) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (email,))
            row = cursor.fetchone()

    if row is None:
        return None

    return dict(zip(
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


def database_error_response():
    app.logger.exception("No fue posible consultar registro_db")
    return jsonify({"error": "No fue posible consultar el servicio de seguridad."}), 503


def get_json_body(required_fields: tuple[str, ...]):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or any(
        not isinstance(data.get(field), str) or not data[field].strip()
        for field in required_fields
    ):
        return None
    return data


@app.post("/security/validuser")
def validuser():
    data = get_json_body(("email", "password"))
    if data is None:
        return jsonify({"error": "Se requieren email y password."}), 400

    try:
        user = find_user_by_email(data["email"])
    except psycopg2.Error:
        return database_error_response()

    if user is None:
        return jsonify({"error": "Usuario no encontrado / error con la contraseña."}), 404

    password_hash = user["password_hash"]
    password = decrypt_password(password_hash) if isinstance(password_hash, str) else None
    if password is None or not hmac.compare_digest(password, data["password"]):
        return jsonify({"error": "Usuario no encontrado / error con la contraseña."}), 404

    return jsonify({field: user[field] for field in PROFILE_FIELDS}), 200


@app.post("/security/validemail")
def validemail():
    data = get_json_body(("email",))
    if data is None:
        return jsonify({"error": "Se requiere email."}), 400

    try:
        user = find_user_by_email(data["email"])
    except psycopg2.Error:
        return database_error_response()

    if user is None:
        return jsonify({"error": "Usuario no encontrado."}), 404

    return jsonify({field: user[field] for field in PROFILE_FIELDS}), 200


@app.post("/security/validotp")
def validotp():
    data = get_json_body(("totp_secret", "otp_code"))
    if data is None or len(data["otp_code"]) != 6 or not data["otp_code"].isdigit():
        return jsonify({"message": "Código inválido. Intente nuevamente."}), 400

    try:
        is_valid = pyotp.TOTP(data["totp_secret"]).verify(data["otp_code"])
    except (binascii.Error, ValueError):
        is_valid = False

    if not is_valid:
        return jsonify({"message": "Código inválido. Intente nuevamente."}), 400

    return jsonify({
        "message": "Código válido. Autenticación exitosa.",
        "guid": str(uuid.uuid4()),
    }), 200


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(host="0.0.0.0", port=6600)
