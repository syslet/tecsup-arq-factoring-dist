from factoring_app.interface.desembolso_app import create_app as create_desembolso_app
from factoring_app.interface.registro_app import create_app as create_registro_app
from factoring_app.interface.venta_app import create_app as create_venta_app


def test_registro_app_expone_solo_sus_rutas():
    app = create_registro_app()
    assert {rule.rule for rule in app.url_map.iter_rules()} == {
        "/static/<path:filename>",
        "/registro/usuario",
        "/registro/empresa",
        "/registro/documento",
    }


def test_venta_app_expone_solo_sus_rutas():
    app = create_venta_app()
    assert {rule.rule for rule in app.url_map.iter_rules()} == {
        "/static/<path:filename>",
        "/venta/planilla",
        "/venta/planillas",
    }


def test_venta_app_consulta_planillas_por_query_params(monkeypatch):
    from factoring_app.interface import venta_app

    result = [
        {
            "invoice_sheet_id": 12,
            "created_at": "2026-09-20T00:00:00",
            "sheet_code": "PLAN001",
            "invoice_id": 30,
            "invoice_number": "F001-0001",
            "debtor_ruc": "20111111111",
            "debtor_name": "Deudor SAC",
            "amount": 10000.0,
            "currency": "PEN",
            "status": "QUOTED",
        }
    ]
    calls = []

    class UseCase:
        def ejecutar(self, company_id, status=None):
            calls.append((company_id, status))
            return result

    monkeypatch.setattr(venta_app, "ConsultarPlanillaUseCase", UseCase)
    app = create_venta_app()
    with app.test_request_context("/venta/planillas?company_id=9&status=QUOTED"):
        response = app.full_dispatch_request()

    assert response.status_code == 200
    assert response.get_json() == {"planillas": result}
    assert calls == [(9, "QUOTED")]


def test_venta_app_devuelve_404_si_no_hay_planillas(monkeypatch):
    from factoring_app.interface import venta_app

    class UseCase:
        def ejecutar(self, company_id, status=None):
            return []

    monkeypatch.setattr(venta_app, "ConsultarPlanillaUseCase", UseCase)
    app = create_venta_app()
    with app.test_request_context("/venta/planillas?company_id=9"):
        response = app.full_dispatch_request()

    assert response.status_code == 404
    assert response.get_json() == {
        "error": "No se encontraron planillas para la empresa."
    }


def test_venta_app_valida_company_id_query_param():
    app = create_venta_app()

    with app.test_request_context("/venta/planillas"):
        missing = app.full_dispatch_request()
    with app.test_request_context("/venta/planillas?company_id=empresa"):
        invalid = app.full_dispatch_request()

    assert missing.status_code == 400
    assert invalid.status_code == 400


def test_desembolso_app_expone_solo_sus_rutas():
    app = create_desembolso_app()
    assert {rule.rule for rule in app.url_map.iter_rules()} == {
        "/static/<path:filename>",
        "/desembolso",
    }
