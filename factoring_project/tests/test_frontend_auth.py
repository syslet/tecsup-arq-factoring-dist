import importlib.util
from datetime import datetime, timezone
from pathlib import Path

from authlib.jose import jwt


FRONTEND_APP = Path(__file__).parents[1] / "frontend_web" / "app.py"
PROFILE = {
    "user_id": 7,
    "company_id": 12,
    "ruc": "20123456789",
    "business_name": "Empresa de Ana",
    "dni": "12345678",
    "email": "ana@example.com",
    "full_name": "Ana Pérez",
    "phone": "987654321",
    "verification_status": "JBSWY3DPEHPK3PXP",
}


def load_frontend_module(monkeypatch):
    monkeypatch.setenv("SECURITY_ADAPTER_URL", "http://security_adapter:6600")
    spec = importlib.util.spec_from_file_location("frontend_web_auth_app", FRONTEND_APP)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def invoke_post(module, route, path, payload):
    with module.app.test_request_context(path, method="POST", json=payload):
        return route()


def session_token(module, expires_in):
    claims = {
        **PROFILE,
        "exp": int(datetime.now(timezone.utc).timestamp()) + expires_in,
    }
    return jwt.encode({"alg": "HS256"}, claims, module.SECRET_KEY).decode("ascii")


def test_social_login_valida_email_y_establece_cookie_jwt(monkeypatch):
    module = load_frontend_module(monkeypatch)
    calls = []

    class Response:
        ok = True

        def json(self):
            return PROFILE

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return Response()

    monkeypatch.setattr(module.requests, "post", fake_post)
    response, status = invoke_post(
        module,
        module.api_auth_social,
        "/api/auth/social",
        {"email": PROFILE["email"]},
    )

    cookie = response.headers["Set-Cookie"]
    token = cookie.split("=", 1)[1].split(";", 1)[0]
    claims = jwt.decode(token, module.SECRET_KEY)
    remaining_seconds = claims["exp"] - int(datetime.now(timezone.utc).timestamp())

    assert status == 200
    assert response.get_json() == {"authenticated": True}
    assert "jwt_factoring=" in cookie
    assert "HttpOnly" in cookie
    assert "Max-Age=600" in cookie
    assert 590 <= remaining_seconds <= 600
    assert {field: claims[field] for field in PROFILE} == PROFILE
    assert calls == [
        (
            "http://security_adapter:6600/security/validemail",
            {"json": {"email": PROFILE["email"]}, "timeout": 10},
        )
    ]


def test_credenciales_validas_verifican_usuario_y_otp(monkeypatch):
    module = load_frontend_module(monkeypatch)
    calls = []

    class Response:
        ok = True

        def __init__(self, result):
            self.result = result

        def json(self):
            return self.result

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        if url.endswith("/validuser"):
            return Response(PROFILE)
        return Response({"message": "Código válido. Autenticación exitosa.", "guid": "guid"})

    monkeypatch.setattr(module.requests, "post", fake_post)
    response, status = invoke_post(
        module,
        module.api_auth_credentials,
        "/api/auth/credentials",
        {"email": PROFILE["email"], "password": "secret", "otp_code": "123456"},
    )

    assert status == 200
    assert "jwt_factoring=" in response.headers["Set-Cookie"]
    assert calls == [
        (
            "http://security_adapter:6600/security/validuser",
            {"json": {"email": PROFILE["email"], "password": "secret"}, "timeout": 10},
        ),
        (
            "http://security_adapter:6600/security/validotp",
            {"json": {"totp_secret": PROFILE["verification_status"], "otp_code": "123456"}, "timeout": 10},
        ),
    ]


def test_credenciales_con_otp_invalido_no_crean_cookie(monkeypatch):
    module = load_frontend_module(monkeypatch)

    class Response:
        def __init__(self, ok, result):
            self.ok = ok
            self.result = result

        def json(self):
            return self.result

    def fake_post(url, **kwargs):
        if url.endswith("/validuser"):
            return Response(True, PROFILE)
        return Response(False, {"message": "Código inválido. Intente nuevamente."})

    monkeypatch.setattr(module.requests, "post", fake_post)
    response, status = invoke_post(
        module,
        module.api_auth_credentials,
        "/api/auth/credentials",
        {"email": PROFILE["email"], "password": "secret", "otp_code": "000000"},
    )

    assert status == 401
    assert response.get_json()["stage"] == "otp"
    assert "Set-Cookie" not in response.headers


def test_error_de_security_adapter_no_autentica_usuario(monkeypatch):
    module = load_frontend_module(monkeypatch)

    class Response:
        ok = False

    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: Response())
    response, status = invoke_post(
        module,
        module.api_auth_social,
        "/api/auth/social",
        {"email": PROFILE["email"]},
    )

    assert status == 401
    assert response.get_json()["stage"] == "user"


def test_session_valida_jwt_y_retorna_nombre(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)
    with module.app.test_request_context(
        "/api/auth/session",
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_auth_session()

    assert status == 200
    assert response.get_json() == {
        "full_name": PROFILE["full_name"],
        "company_id": PROFILE["company_id"],
    }


def test_proxy_planillas_consulta_empresa_del_jwt(monkeypatch):
    module = load_frontend_module(monkeypatch)
    monkeypatch.setattr(module, "VENTA_APP_URL", "http://venta_app:5002")
    token = session_token(module, 600)
    calls = []

    class VentaResponse:
        status_code = 200
        ok = True

        def json(self):
            return {"planillas": [{"invoice_id": 3, "invoice_number": "F001-1"}]}

    def fake_get(url, **kwargs):
        calls.append((url, kwargs))
        return VentaResponse()

    monkeypatch.setattr(module.requests, "get", fake_get)
    with module.app.test_request_context(
        "/api/venta/planillas?company_id=12",
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_venta_planillas()

    assert status == 200
    assert response.get_json() == {
        "planillas": [{"invoice_id": 3, "invoice_number": "F001-1"}]
    }
    assert calls == [
        (
            "http://venta_app:5002/venta/planillas",
            {"params": {"company_id": PROFILE["company_id"]}, "timeout": 10},
        )
    ]


def test_proxy_planillas_rechaza_empresa_distinta_al_jwt(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)
    calls = []
    monkeypatch.setattr(module.requests, "get", lambda *args, **kwargs: calls.append(args))
    with module.app.test_request_context(
        "/api/venta/planillas?company_id=99",
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_venta_planillas()

    assert status == 403
    assert calls == []


def test_proxy_planillas_traduce_404_a_lista_vacia(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)

    class VentaResponse:
        status_code = 404
        ok = False

    monkeypatch.setattr(module.requests, "get", lambda *args, **kwargs: VentaResponse())
    with module.app.test_request_context(
        "/api/venta/planillas?company_id=12",
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_venta_planillas()

    assert status == 200
    assert response.get_json() == {"planillas": []}


def test_session_rechaza_jwt_expirado_y_elimina_cookie(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, -60)
    with module.app.test_request_context(
        "/api/auth/session",
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_auth_session()

    assert status == 401
    assert response.get_json() == {"error": "La sesión expiró o no es válida."}
    assert "jwt_factoring=;" in response.headers["Set-Cookie"]


def test_session_rechaza_cookie_ausente(monkeypatch):
    module = load_frontend_module(monkeypatch)
    with module.app.test_request_context("/api/auth/session"):
        response, status = module.api_auth_session()

    assert status == 401
    assert "jwt_factoring=;" in response.headers["Set-Cookie"]


def test_logout_elimina_cookie_de_sesion(monkeypatch):
    module = load_frontend_module(monkeypatch)
    with module.app.test_request_context("/api/auth/logout", method="POST"):
        response = module.api_auth_logout()

    assert response.get_json() == {"authenticated": False}
    assert "jwt_factoring=;" in response.headers["Set-Cookie"]
