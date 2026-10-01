from datetime import date

import pytest

from factoring_app.application import venta_use_cases
from factoring_app.application.venta_use_cases import (
    ConsultarPlanillaUseCase,
    ImportarPlanillaUseCase,
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

    def flush(self):
        self.entities[-1].id = 20 + sum(
            isinstance(entity, InvoiceSheet) for entity in self.entities
        )

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


def test_importar_planillas_guarda_planillas_y_facturas(monkeypatch):
    session = FakeSession()
    monkeypatch.setattr(venta_use_cases, "VentaSessionLocal", lambda: session)
    planillas = [
        {
            "numero_planilla": "PLA-2026-0185",
            "facturas": [
                {
                    "numero_factura": "F001-0001",
                    "ruc_girador": "20106028351",
                    "ruc_aceptante": "20123456789",
                    "nombre_aceptante": "Distribuidora Andina S.A.C.",
                    "importe": "128,450.00",
                    "moneda": "PEN",
                    "fech_emision": "5/07/2026",
                    "fecha_vencimiento": "5/10/2026",
                },
                {
                    "numero_factura": "F001-0002",
                    "ruc_girador": "20106028351",
                    "ruc_aceptante": "20548796321",
                    "nombre_aceptante": "Servicios Industriales Del Pacífico",
                    "importe": "42,780.00",
                    "moneda": "PEN",
                    "fech_emision": "15/07/2026",
                    "fecha_vencimiento": "15/10/2026",
                },
            ],
        },
        {
            "numero_planilla": "PLA-2026-0186",
            "facturas": [
                {
                    "numero_factura": "F001-0004",
                    "ruc_girador": "20106028351",
                    "ruc_aceptante": "20632147895",
                    "nombre_aceptante": "Logística Integral Perú S.A.C.",
                    "importe": "214,900.00",
                    "moneda": "PEN",
                    "fech_emision": "8/07/2026",
                    "fecha_vencimiento": "8/11/2026",
                }
            ],
        },
    ]

    result = ImportarPlanillaUseCase().ejecutar(7, planillas)

    assert result == [
        {
            "id": 21,
            "numero_planilla": "PLA-2026-0185",
            "status": "Planilla registrada con facturas",
        },
        {
            "id": 22,
            "numero_planilla": "PLA-2026-0186",
            "status": "Planilla registrada con facturas",
        },
    ]
    assert session.committed
    assert session.closed
    sheets = [entity for entity in session.entities if isinstance(entity, InvoiceSheet)]
    assert [(sheet.company_id, sheet.total_amount, sheet.status) for sheet in sheets] == [
        (7, 171230.0, "REGISTRADO"),
        (7, 214900.0, "REGISTRADO"),
    ]
    assert all(
        (
            sheet.advance_amount,
            sheet.interest_fee,
            sheet.commission,
            sheet.net_disbursement,
            sheet.advance_rate,
            sheet.monthly_rate,
        )
        == (0, 0, 0, 0, 0, 0)
        for sheet in sheets
    )
    invoices = [invoice for sheet in sheets for invoice in sheet.invoices]
    assert [invoice.amount for invoice in invoices] == [128450.0, 42780.0, 214900.0]
    assert [invoice.is_approved for invoice in invoices] == [True, True, True]
    assert [invoice.sunat_status for invoice in invoices] == ["VALID"] * 3
    assert invoices[0].issue_date.isoformat() == "2026-07-05"
    assert invoices[0].due_date.isoformat() == "2026-10-05"
    assert invoices[0].days_to_maturity == (date.today() - date(2026, 10, 5)).days


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
