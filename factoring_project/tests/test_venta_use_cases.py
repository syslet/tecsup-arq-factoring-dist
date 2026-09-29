import pytest

from factoring_app.application import venta_use_cases
from factoring_app.application.venta_use_cases import (
    ConsultarPlanillaUseCase,
    RegistrarPlanillaUseCase,
)
from factoring_app.domain.entities import Invoice, InvoiceSheet


class FakeSession:
    def __init__(self):
        self.entities = []
        self.committed = False
        self.closed = False

    def add(self, entity):
        self.entities.append(entity)

    def commit(self):
        self.committed = True

    def refresh(self, entity):
        if isinstance(entity, InvoiceSheet):
            entity.id = 12
        else:
            entity.id = 30

    def rollback(self):
        self.committed = False

    def close(self):
        self.closed = True


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self.filters = []
        self.joined_model = None

    def join(self, model, condition):
        self.joined_model = model
        return self

    def filter(self, condition):
        self.filters.append(condition)
        return self

    def all(self):
        return self.rows


class FakeReadSession:
    def __init__(self, rows):
        self.query_fields = ()
        self.query_result = FakeQuery(rows)
        self.closed = False

    def query(self, *fields):
        self.query_fields = fields
        return self.query_result

    def close(self):
        self.closed = True


def test_registrar_planilla_calcula_y_guarda_venta(monkeypatch):
    session = FakeSession()
    monkeypatch.setattr(venta_use_cases, "VentaSessionLocal", lambda: session)
    monkeypatch.setattr(
        venta_use_cases,
        "get_latest_pricing",
        lambda: {
            "advance_rate": 0.85,
            "monthly_rate": 0.02,
            "timestamp": "2026-09-20T00:00:00",
        },
    )
    planilla = InvoiceSheet(
        company_id=1,
        sheet_code="PLAN001",
        currency="PEN",
        total_amount=10000,
        advance_amount=0,
        interest_fee=0,
        commission=0,
        net_disbursement=0,
        created_at="2026-09-20",
    )

    result = RegistrarPlanillaUseCase().ejecutar(planilla)

    assert result["planilla_id"] == 12
    assert result["sale_id"] == 30
    assert result["advance_amount"] == pytest.approx(1500)
    assert result["interest_fee"] == pytest.approx(30)
    assert result["commission"] == pytest.approx(8500)
    assert result["net_disbursement"] == pytest.approx(1470)
    assert session.committed
    assert session.closed


def test_registrar_planilla_rechaza_factura_invalida(monkeypatch):
    session = FakeSession()
    monkeypatch.setattr(venta_use_cases, "VentaSessionLocal", lambda: session)
    monkeypatch.setattr(
        venta_use_cases,
        "get_latest_pricing",
        lambda: {"advance_rate": 0.85, "monthly_rate": 0.02},
    )
    validator = type("Validator", (), {"validar_factura": lambda self, invoice: False})()
    planilla = InvoiceSheet(
        company_id=1,
        sheet_code="PLAN002",
        currency="PEN",
        total_amount=10000,
        advance_amount=0,
        interest_fee=0,
        commission=0,
        net_disbursement=0,
        created_at="2026-09-20",
    )
    invoice = Invoice(invoice_number="F001-0001")

    with pytest.raises(ValueError, match="Factura inválida: F001-0001"):
        RegistrarPlanillaUseCase(validacion_service=validator).ejecutar(
            planilla, [invoice]
        )

    assert not session.committed
    assert session.closed


def test_consultar_planillas_filtra_por_empresa_y_status(monkeypatch):
    result = {
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
    session = FakeReadSession([type("Row", (), {"_mapping": result})()])
    monkeypatch.setattr(venta_use_cases, "VentaSessionLocal", lambda: session)

    rows = ConsultarPlanillaUseCase().ejecutar(9, "QUOTED")

    assert rows == [result]
    assert session.query_result.joined_model is Invoice
    assert len(session.query_fields) == 10
    assert len(session.query_result.filters) == 2
    assert session.closed


def test_consultar_planillas_omite_filtro_status_si_no_se_indica(monkeypatch):
    session = FakeReadSession([])
    monkeypatch.setattr(venta_use_cases, "VentaSessionLocal", lambda: session)

    rows = ConsultarPlanillaUseCase().ejecutar(9)

    assert rows == []
    assert len(session.query_result.filters) == 1
    assert session.closed
