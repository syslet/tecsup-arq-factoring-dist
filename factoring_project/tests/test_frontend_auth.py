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
    "bank_name": "BCP",
    "bank_account_number": "001234567890",
    "cci": "00212345678901234567",
    "currency": "PEN",
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
    cookie = response.headers["Set-Cookie"]
    token = cookie.split("=", 1)[1].split(";", 1)[0]
    claims = jwt.decode(token, module.SECRET_KEY)
    assert {
        field: claims[field]
        for field in ("bank_name", "bank_account_number", "cci", "currency")
    } == {
        "bank_name": PROFILE["bank_name"],
        "bank_account_number": PROFILE["bank_account_number"],
        "cci": PROFILE["cci"],
        "currency": PROFILE["currency"],
    }
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
        "currency": PROFILE["currency"],
    }
    cookie = response.headers["Set-Cookie"]
    refreshed_token = cookie.split("=", 1)[1].split(";", 1)[0]
    refreshed_claims = jwt.decode(refreshed_token, module.SECRET_KEY)
    remaining_seconds = refreshed_claims["exp"] - int(datetime.now(timezone.utc).timestamp())
    assert 590 <= remaining_seconds <= 600
    assert f"Max-Age={module.SESSION_TTL_SECONDS}" in cookie


def test_proxy_desembolso_masivo_completa_datos_desde_jwt(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)
    calls = []
    planillas = [
        {
            "id_planilla": 13,
            "numero_planilla": "PLA-2026-0185",
            "importe": "257430.00",
            "tasa_descuento": "0.15",
            "tasa_comision": "0.02",
        }
    ]

    class DesembolsoResponse:
        ok = True
        status_code = 200

        def json(self):
            return [
                {
                    "annotation_code": "ANOT-PLA-2026-0185",
                    "disbursement_amount": 213666.9,
                    "disbursement_id": 5,
                    "status": "Planilla Desembolsada",
                }
            ]

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return DesembolsoResponse()

    monkeypatch.setattr(module.requests, "post", fake_post)
    with module.app.test_request_context(
        "/api/desembolso/masivo",
        method="POST",
        json={"planillas": planillas},
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_desembolso_masivo()

    assert status == 200
    assert response.get_json()[0]["disbursement_amount"] == 213666.9
    assert calls == [
        (
            "http://localhost:5003/desembolso/masivo",
            {
                "json": {
                    "user_id": PROFILE["user_id"],
                    "company_id": PROFILE["company_id"],
                    "phone": PROFILE["phone"],
                    "bank_name": PROFILE["bank_name"],
                    "bank_account_number": PROFILE["bank_account_number"],
                    "cci": PROFILE["cci"],
                    "currency": PROFILE["currency"],
                    "email": PROFILE["email"],
                    "planillas": planillas,
                },
                "timeout": 10,
            },
        )
    ]


def test_proxy_desembolso_masivo_retorna_error_del_servicio(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)

    class DesembolsoResponse:
        ok = False
        status_code = 400

        def json(self):
            return {"error": "Debe proporcionar al menos una planilla."}

    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: DesembolsoResponse())
    with module.app.test_request_context(
        "/api/desembolso/masivo",
        method="POST",
        json={"planillas": [{}]},
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_desembolso_masivo()

    assert status == 400
    assert response.get_json() == {"error": "Debe proporcionar al menos una planilla."}


def test_proxy_validotp_usa_secreto_del_jwt(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)
    calls = []

    class SecurityResponse:
        ok = True
        status_code = 200

        def json(self):
            return {"message": "Código válido. Autenticación exitosa."}

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return SecurityResponse()

    monkeypatch.setattr(module.requests, "post", fake_post)
    with module.app.test_request_context(
        "/api/security/validotp",
        method="POST",
        json={"otp_code": "123456"},
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_security_validotp()

    assert status == 200
    assert response.get_json() == {"message": "Código válido. Autenticación exitosa."}
    assert calls == [
        (
            "http://security_adapter:6600/security/validotp",
            {
                "json": {
                    "totp_secret": PROFILE["verification_status"],
                    "otp_code": "123456",
                },
                "timeout": 10,
            },
        )
    ]


def test_proxy_validotp_retorna_mensaje_del_servicio_si_falla(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)

    class SecurityResponse:
        ok = False
        status_code = 400

        def json(self):
            return {"message": "Código inválido. Intente nuevamente."}

    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: SecurityResponse())
    with module.app.test_request_context(
        "/api/security/validotp",
        method="POST",
        json={"otp_code": "000000"},
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_security_validotp()

    assert status == 400
    assert response.get_json() == {"error": "Código inválido. Intente nuevamente."}


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


def test_proxy_importa_planillas_con_empresa_del_jwt(monkeypatch):
    module = load_frontend_module(monkeypatch)
    monkeypatch.setattr(module, "VENTA_APP_URL", "http://venta_app:5002")
    token = session_token(module, 600)
    calls = []
    planillas = [{"numero_planilla": "PLA-2026-0185", "facturas": []}]

    class VentaResponse:
        ok = True
        status_code = 200

        def json(self):
            return [{"id": 2, "numero_planilla": "PLA-2026-0185"}]

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return VentaResponse()

    monkeypatch.setattr(module.requests, "post", fake_post)
    with module.app.test_request_context(
        "/api/venta/planilla/importar?companyId=12",
        method="POST",
        json=planillas,
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_venta_importar_planillas()

    assert status == 200
    assert response.get_json() == [{"id": 2, "numero_planilla": "PLA-2026-0185"}]
    assert calls == [
        (
            "http://venta_app:5002/venta/planilla/importar",
            {"params": {"companyId": PROFILE["company_id"]}, "json": planillas, "timeout": 10},
        )
    ]


def test_proxy_importar_rechaza_empresa_distinta_al_jwt(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)
    calls = []
    monkeypatch.setattr(module.requests, "post", lambda *args, **kwargs: calls.append(args))
    with module.app.test_request_context(
        "/api/venta/planilla/importar?companyId=99",
        method="POST",
        json=[],
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_venta_importar_planillas()

    assert status == 403
    assert calls == []


def test_proxy_pricing_consulta_ultimo_evento(monkeypatch):
    module = load_frontend_module(monkeypatch)
    monkeypatch.setattr(
        module,
        "PRICING_SERVICE_URL",
        "http://pricing_rabbitmq_adapter:6400",
    )
    token = session_token(module, 600)
    calls = []

    class PricingResponse:
        ok = True

        def json(self):
            return {
                "type": "pricing_update",
                "advance_rate": 0.1352,
                "monthly_rate": 0.0156,
                "timestamp": "2026-08-22T02:58:07.695086",
            }

    def fake_get(url, **kwargs):
        calls.append((url, kwargs))
        return PricingResponse()

    monkeypatch.setattr(module.requests, "get", fake_get)
    with module.app.test_request_context(
        "/api/pricing/latest",
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_pricing_latest()

    assert status == 200
    assert response.get_json() == {
        "type": "pricing_update",
        "advance_rate": 0.1352,
        "monthly_rate": 0.0156,
        "timestamp": "2026-08-22T02:58:07.695086",
    }
    assert calls == [
        (
            "http://pricing_rabbitmq_adapter:6400/pricing/latest",
            {"timeout": 10},
        )
    ]


def test_proxy_pricing_devuelve_error_si_cola_esta_vacia(monkeypatch):
    module = load_frontend_module(monkeypatch)
    token = session_token(module, 600)

    class PricingResponse:
        ok = True

        def json(self):
            return {"error": "No hay mensajes en la cola"}

    monkeypatch.setattr(module.requests, "get", lambda *args, **kwargs: PricingResponse())
    with module.app.test_request_context(
        "/api/pricing/latest",
        headers={"Cookie": f"jwt_factoring={token}"},
    ):
        response, status = module.api_pricing_latest()

    assert status == 503
    assert response.get_json() == {"error": "No hay mensajes en la cola"}


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
