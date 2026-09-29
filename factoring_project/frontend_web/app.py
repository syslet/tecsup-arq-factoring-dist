from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, redirect, url_for, request, render_template, session, Response
from authlib.integrations.flask_client import OAuth
from authlib.jose import jwt
from authlib.jose.errors import JoseError
import requests
import os
import pyotp
import qrcode
import base64
import uuid
import hashlib
import json
from cryptography.fernet import Fernet
from io import BytesIO
from PIL import Image

app = Flask(__name__)
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
app.secret_key = SECRET_KEY

# Configuración OAuth
oauth = OAuth(app)

# Google
app.config['GOOGLE_CLIENT_ID'] = os.getenv("GOOGLE_CLIENT_ID")
app.config['GOOGLE_CLIENT_SECRET'] = os.getenv("GOOGLE_CLIENT_SECRET")
google = oauth.register(
    name='google',
    client_id=app.config['GOOGLE_CLIENT_ID'],
    client_secret=app.config['GOOGLE_CLIENT_SECRET'],
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# Facebook
app.config['FACEBOOK_CLIENT_ID'] = os.getenv("FACEBOOK_CLIENT_ID")
app.config['FACEBOOK_CLIENT_SECRET'] = os.getenv("FACEBOOK_CLIENT_SECRET")
facebook = oauth.register(
    name='facebook',
    client_id=app.config['FACEBOOK_CLIENT_ID'],
    client_secret=app.config['FACEBOOK_CLIENT_SECRET'],
    authorize_url='https://www.facebook.com/v17.0/dialog/oauth',
    access_token_url='https://graph.facebook.com/v17.0/oauth/access_token',
    api_base_url='https://graph.facebook.com/v17.0/',
    client_kwargs={'scope': 'email'}
)

user_data = {}
MAX_PASSWORD_HASH_LENGTH = 100
REGISTRO_APP_URL = os.getenv("REGISTRO_APP_URL", "http://registro_app:5001")
SECURITY_ADAPTER_URL = os.getenv("SECURITY_ADAPTER_URL", "http://localhost:6600").rstrip("/")
VENTA_APP_URL = os.getenv("VENTA_APP_URL", "http://localhost:5002").rstrip("/")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:7001").rstrip("/")
SESSION_COOKIE_NAME = "jwt_factoring"
SESSION_TTL_SECONDS = 10 * 60
SESSION_PROFILE_FIELDS = (
    "user_id",
    "company_id",
    "ruc",
    "business_name",
    "dni",
    "email",
    "full_name",
    "phone",
    "verification_status",
)


def encrypt_password_hash(password_hash, secret_key):
    """Encrypt the password value using SECRET_KEY as the key seed."""
    if not password_hash or not secret_key:
        raise ValueError("password_hash y SECRET_KEY son obligatorios")

    key = base64.urlsafe_b64encode(
        hashlib.sha256(secret_key.encode("utf-8")).digest()
    )
    encrypted_password_hash = Fernet(key).encrypt(
        password_hash.encode("utf-8")
    ).decode("utf-8")
    if len(encrypted_password_hash) > MAX_PASSWORD_HASH_LENGTH:
        raise ValueError(
            f"El password_hash cifrado no puede superar "
            f"{MAX_PASSWORD_HASH_LENGTH} caracteres"
        )
    return encrypted_password_hash


def registrar_usuario_en_backend(payload):
    """Envía el registro al servicio Registro distribuido."""
    response = requests.post(
        f"{REGISTRO_APP_URL.rstrip('/')}/registro/usuario",
        json=payload,
        timeout=10,
    )
    response.raise_for_status()
    return response


def post_registro_app(path, payload):
    try:
        response = requests.post(
            f"{REGISTRO_APP_URL.rstrip('/')}{path}",
            json=payload,
            timeout=10,
        )
    except requests.RequestException:
        app.logger.exception("No fue posible conectar con registro_app%s", path)
        return None, (jsonify({"error": "No fue posible conectar con el servicio de registro."}), 502)

    try:
        result = response.json()
    except ValueError:
        app.logger.error("registro_app%s devolvió una respuesta no válida", path)
        return None, (jsonify({"error": "El servicio de registro devolvió una respuesta no válida."}), 502)

    if not isinstance(result, dict):
        app.logger.error("registro_app%s devolvió una respuesta JSON inesperada", path)
        return None, (jsonify({"error": "El servicio de registro devolvió una respuesta no válida."}), 502)

    if not response.ok:
        return None, (jsonify(result), response.status_code)

    return result, None


@app.post("/api/registro/usuario")
def api_registrar_usuario():
    data = request.get_json(silent=True)
    required = ("email", "password", "full_name", "dni", "phone")
    if not isinstance(data, dict) or any(
        not isinstance(data.get(field), str) or not data[field].strip()
        for field in required
    ):
        return jsonify({"error": "Faltan datos obligatorios para registrar el usuario."}), 400

    try:
        encrypted_password_hash = encrypt_password_hash(data["password"], SECRET_KEY)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    totp_secret = pyotp.random_base32()
    totp = pyotp.TOTP(totp_secret)
    provisioning_uri = totp.provisioning_uri(
        name=data["email"],
        issuer_name="FactoringApp",
    )
    qr_image = qrcode.make(provisioning_uri)
    buffer = BytesIO()
    qr_image.save(buffer, format="PNG")
    qr_code = base64.b64encode(buffer.getvalue()).decode("ascii")

    payload = {
        "email": data["email"],
        "password_hash": encrypted_password_hash,
        "full_name": data["full_name"],
        "dni": data["dni"],
        "phone": data["phone"],
        "verification_status": totp_secret,
    }
    result, error_response = post_registro_app("/registro/usuario", payload)
    if error_response:
        return error_response

    user_id = result.get("id")
    if not isinstance(user_id, (int, str)) or (isinstance(user_id, str) and not user_id.strip()):
        app.logger.error("registro_app no devolvió el id del usuario registrado")
        return jsonify({"error": "El servicio de registro no devolvió el identificador del usuario."}), 502

    return jsonify({
        "user_id": user_id,
        "totp_secret": totp_secret,
        "qr_code": f"data:image/png;base64,{qr_code}",
    }), 201


@app.post("/api/registro/empresa")
def api_registrar_empresa():
    data = request.get_json(silent=True)
    required = (
        "ruc",
        "business_name",
        "legal_representative_user_id",
        "bank_name",
        "bank_account_number",
        "cci",
        "currency",
    )
    if not isinstance(data, dict):
        return jsonify({"error": "Faltan datos obligatorios para registrar la empresa."}), 400

    text_fields = tuple(field for field in required if field != "legal_representative_user_id")
    user_id = data.get("legal_representative_user_id")
    if (
        any(not isinstance(data.get(field), str) or not data[field].strip() for field in text_fields)
        or not isinstance(user_id, (int, str))
        or (isinstance(user_id, str) and not user_id.strip())
    ):
        return jsonify({"error": "Faltan datos obligatorios para registrar la empresa."}), 400

    result, error_response = post_registro_app("/registro/empresa", data)
    if error_response:
        return error_response

    return jsonify(result), 201


def security_service_request(path, payload):
    try:
        response = requests.post(
            f"{SECURITY_ADAPTER_URL}/security/{path}",
            json=payload,
            timeout=10,
        )
    except requests.RequestException:
        app.logger.exception("No fue posible conectar con security_adapter/%s", path)
        return None, (jsonify({"error": "No fue posible validar el usuario."}), 503)

    if not response.ok:
        return None, None

    try:
        result = response.json()
    except ValueError:
        app.logger.error("security_adapter/%s devolvió una respuesta no válida", path)
        return None, (jsonify({"error": "El servicio de seguridad devolvió una respuesta no válida."}), 502)

    if not isinstance(result, dict):
        app.logger.error("security_adapter/%s devolvió una respuesta JSON inesperada", path)
        return None, (jsonify({"error": "El servicio de seguridad devolvió una respuesta no válida."}), 502)

    return result, None


def has_session_profile(profile):
    return (
        all(
            isinstance(profile.get(field), int) and not isinstance(profile.get(field), bool)
            for field in ("user_id", "company_id")
        )
        and all(
            isinstance(profile.get(field), str) and profile[field]
            for field in SESSION_PROFILE_FIELDS
            if field not in ("user_id", "company_id")
        )
    )


def create_authenticated_session(profile):
    claims = {field: profile[field] for field in SESSION_PROFILE_FIELDS}
    claims["exp"] = int((datetime.now(timezone.utc) + timedelta(seconds=SESSION_TTL_SECONDS)).timestamp())
    encoded_token = jwt.encode({"alg": "HS256"}, claims, SECRET_KEY).decode("ascii")

    response = jsonify({"authenticated": True})
    response.set_cookie(
        SESSION_COOKIE_NAME,
        encoded_token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=request.is_secure,
        samesite="Lax",
        path="/",
    )
    return response, 200


@app.post("/api/auth/social")
def api_auth_social():
    data = request.get_json(silent=True)
    email = data.get("email") if isinstance(data, dict) else None
    if not isinstance(email, str) or not email.strip():
        return jsonify({"error": "Se requiere email.", "stage": "user"}), 400

    profile, error_response = security_service_request("validemail", {"email": email})
    if error_response:
        return error_response
    if profile is None:
        return jsonify({"error": "Usuario no autenticado.", "stage": "user"}), 401
    if not has_session_profile(profile):
        app.logger.error("security_adapter/validemail devolvió un perfil incompleto")
        return jsonify({"error": "El servicio de seguridad devolvió un perfil incompleto."}), 502

    return create_authenticated_session(profile)


@app.post("/api/auth/credentials")
def api_auth_credentials():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Se requieren usuario y contraseña.", "stage": "user"}), 400

    email = data.get("email")
    password = data.get("password")
    otp_code = data.get("otp_code")
    if not all(isinstance(value, str) and value.strip() for value in (email, password, otp_code)):
        return jsonify({"error": "Se requieren usuario, contraseña y código OTP.", "stage": "user"}), 400

    profile_response, error_response = security_service_request(
        "validuser",
        {"email": email, "password": password},
    )
    if error_response:
        return error_response
    if profile_response is None:
        return jsonify({"error": "Usuario no autenticado.", "stage": "user"}), 401
    if not has_session_profile(profile_response):
        app.logger.error("security_adapter/validuser devolvió un perfil incompleto")
        return jsonify({"error": "El servicio de seguridad devolvió un perfil incompleto."}), 502

    totp_secret = profile_response.get("verification_status")
    if not isinstance(totp_secret, str) or not totp_secret:
        return jsonify({"error": "Usuario no autenticado / Código OTP inválido.", "stage": "otp"}), 401

    otp_response, error_response = security_service_request(
        "validotp",
        {"totp_secret": totp_secret, "otp_code": otp_code},
    )
    if error_response:
        return error_response
    if otp_response is None:
        return jsonify({"error": "Usuario no autenticado / Código OTP inválido.", "stage": "otp"}), 401

    return create_authenticated_session(profile_response)


@app.post("/api/auth/logout")
def api_auth_logout():
    response = jsonify({"authenticated": False})
    response.delete_cookie(SESSION_COOKIE_NAME, path="/", samesite="Lax")
    return response


def get_valid_session_claims():
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        response = jsonify({"error": "Sesión no autenticada."})
        response.delete_cookie(SESSION_COOKIE_NAME, path="/", samesite="Lax")
        return None, (response, 401)

    try:
        claims = jwt.decode(token, SECRET_KEY)
        claims.validate()
    except JoseError:
        response = jsonify({"error": "La sesión expiró o no es válida."})
        response.delete_cookie(SESSION_COOKIE_NAME, path="/", samesite="Lax")
        return None, (response, 401)

    if not has_session_profile(claims):
        response = jsonify({"error": "La sesión no contiene un perfil válido."})
        response.delete_cookie(SESSION_COOKIE_NAME, path="/", samesite="Lax")
        return None, (response, 401)

    return claims, None


@app.get("/api/auth/session")
def api_auth_session():
    claims, error_response = get_valid_session_claims()
    if error_response:
        return error_response

    return jsonify({
        "full_name": claims["full_name"],
        "company_id": claims["company_id"],
    }), 200


@app.get("/api/venta/planillas")
def api_venta_planillas():
    claims, error_response = get_valid_session_claims()
    if error_response:
        return error_response

    company_id = request.args.get("company_id", type=int)
    if company_id is None or company_id <= 0:
        return jsonify({"error": "El parámetro company_id debe ser un entero positivo."}), 400
    if company_id != claims["company_id"]:
        return jsonify({"error": "La empresa solicitada no corresponde a la sesión."}), 403

    try:
        venta_response = requests.get(
            f"{VENTA_APP_URL}/venta/planillas",
            params={"company_id": company_id},
            timeout=10,
        )
    except requests.RequestException:
        app.logger.exception("No fue posible consultar las planillas de la empresa")
        return jsonify({"error": "No fue posible consultar las planillas."}), 503

    if venta_response.status_code == 404:
        return jsonify({"planillas": []}), 200
    if not venta_response.ok:
        app.logger.error("venta_app devolvió HTTP %s al consultar planillas", venta_response.status_code)
        return jsonify({"error": "No fue posible consultar las planillas."}), 502

    try:
        result = venta_response.json()
    except ValueError:
        app.logger.error("venta_app devolvió una respuesta JSON no válida al consultar planillas")
        return jsonify({"error": "El servicio de venta devolvió una respuesta no válida."}), 502

    if not isinstance(result, dict) or not isinstance(result.get("planillas"), list):
        app.logger.error("venta_app devolvió una respuesta inesperada al consultar planillas")
        return jsonify({"error": "El servicio de venta devolvió una respuesta no válida."}), 502

    return jsonify({"planillas": result["planillas"]}), 200


@app.route('/')
def index():
    return redirect(url_for('step1'))

@app.route('/registro/step1')
def step1():
    return render_template('step1.html')

@app.route('/login/<provider>')
def login(provider):
    if provider not in {'google', 'facebook'}:
        return "Proveedor no soportado", 400

    session['oauth_popup'] = request.args.get('popup') == '1'
    if session['oauth_popup']:
        requested_origin = request.args.get('origin', '').rstrip('/')
        session['oauth_origin'] = requested_origin if requested_origin == FRONTEND_ORIGIN else ''
    if provider == 'google':
        redirect_uri = url_for('authorize_google', _external=True)
        return google.authorize_redirect(redirect_uri)

    redirect_uri = url_for('authorize_facebook', _external=True)
    return facebook.authorize_redirect(redirect_uri)


def oauth_popup_response(provider, profile=None, error=None):
    """Send OAuth results back to the SPA that opened the authentication popup."""
    payload = {
        'type': 'factoring-oauth-result',
        'provider': provider,
        'profile': profile,
        'error': error,
    }
    serialized_payload = json.dumps(payload).replace('</', '<\\/')
    target_origin = json.dumps(session.pop('oauth_origin', '') or FRONTEND_ORIGIN)
    response = f"""<!doctype html>
<html lang="es">
  <head><meta charset="utf-8"><title>Autenticación completada</title></head>
  <body>
    <p>Puedes cerrar esta ventana.</p>
    <script>
      const payload = {serialized_payload};
      const targetOrigin = {target_origin};
      if (window.opener && !window.opener.closed) {{
        window.opener.postMessage(payload, targetOrigin);
      }}
      window.close();
    </script>
  </body>
</html>"""
    return Response(response, mimetype='text/html')


def finish_oauth(provider, profile):
    user_data['full_name'] = profile.get('name')
    user_data['email'] = profile.get('email')
    if session.pop('oauth_popup', False):
        return oauth_popup_response(provider, {
            'email': user_data['email'],
            'name': user_data['full_name'],
        })
    return redirect(url_for('step2'))

@app.route('/authorize/google')
def authorize_google():
    google.authorize_access_token()
    resp = google.get('https://openidconnect.googleapis.com/v1/userinfo')
    profile = resp.json()
    return finish_oauth('google', profile)

@app.route('/authorize/facebook')
def authorize_facebook():
    facebook.authorize_access_token()
    resp = facebook.get('me?fields=id,name,email')
    profile = resp.json()
    return finish_oauth('facebook', profile)

@app.route('/registro/step2', methods=['GET', 'POST'])
def step2():
    if request.method == 'POST':
        user_data['dni'] = request.form.get('dni')
        user_data['phone'] = request.form.get('phone')
        user_data['password_hash'] = request.form.get('password')
        return redirect(url_for('step3'))
    return render_template('step2.html', fullname=user_data.get('full_name'), email=user_data.get('email'))

@app.route('/registro/step3', methods=['GET', 'POST'])
def step3():
    qr_b64 = None
    backend_response = None

    if request.method == 'POST':
        if request.form.get('action') == 'register':
            # Generar secreto TOTP y QR
            user_data['totp_secret'] = pyotp.random_base32()
            try:
                encrypted_password_hash = encrypt_password_hash(
                    user_data.get("password_hash"),
                    SECRET_KEY
                )
            except ValueError as error:
                return render_template(
                    'step3.html',
                    data=user_data,
                    qr_code=qr_b64,
                    registered=False,
                    registration_error=str(error)
                ), 400

            totp = pyotp.TOTP(user_data['totp_secret'])
            uri = totp.provisioning_uri(name=user_data.get('email'), issuer_name="FactoringApp")

            qr_img = qrcode.make(uri)
            buffer = BytesIO()
            qr_img.save(buffer, format="PNG")
            qr_b64 = base64.b64encode(buffer.getvalue()).decode()

            # Registrar usuario en backend (sin totp_secret)
            payload = {
                "email": user_data.get("email"),
                "password_hash": encrypted_password_hash,
                "full_name": user_data.get("full_name"),
                "dni": user_data.get("dni"),
                "phone": user_data.get("phone"),
                "verification_status": user_data.get("totp_secret")
            }
            try:
                response = registrar_usuario_en_backend(payload)
                backend_response = response.text
            except requests.RequestException as error:
                return render_template(
                    'step3.html',
                    data=user_data,
                    qr_code=qr_b64,
                    registered=False,
                    registration_error=(
                        "No fue posible registrar el usuario en registro_app: "
                        f"{error}"
                    ),
                ), 502

            return render_template(
                'step3.html',
                data=user_data,
                qr_code=qr_b64,
                registered=True,
                backend_response=backend_response,
            )

        elif request.form.get('action') == 'back':
            return redirect(url_for('step2'))

    return render_template('step3.html', data=user_data, qr_code=qr_b64, registered=False)

@app.route('/validate_otp', methods=['GET', 'POST'])
def validate_otp():
    message = None
    guid = None

    # Obtener el secreto desde user_data o query param
    totp_secret = user_data.get('totp_secret') or request.args.get('totp_secret')

    if request.method == 'POST':
        otp_code = request.form.get('otp_code')
        if not totp_secret:
            message = "No se ha generado un secreto TOTP. Regístrese primero o proporcione ?totp_secret= en la URL."
        else:
            totp = pyotp.TOTP(totp_secret)
            if totp.verify(otp_code):
                message = "✅ Código válido. Autenticación exitosa."
                guid = str(uuid.uuid4())
            else:
                message = "❌ Código inválido. Intente nuevamente."

    return render_template('validate_otp.html', message=message, guid=guid)



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7000, debug=True)
