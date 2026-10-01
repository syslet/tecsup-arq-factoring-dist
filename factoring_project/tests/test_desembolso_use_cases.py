import pytest

from factoring_app.application.desembolso_use_cases import (
    EjecutarDesembolsoMasivoUseCase,
    EjecutarDesembolsoUseCase,
)
from factoring_app.domain.entities import Disbursement, InvoiceSheet


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
        entity.id = 5

    def rollback(self):
        self.committed = False

    def close(self):
        self.closed = True


class FakeQuery:
    def __init__(self, sheets):
        self.sheets = sheets
        self.sheet_id = None

    def filter(self, condition):
        self.sheet_id = condition.right.value
        return self

    def one_or_none(self):
        return self.sheets.get(self.sheet_id)


class FakeVentaSession(FakeSession):
    def __init__(self, sheets):
        super().__init__()
        self.sheets = sheets

    def query(self, model):
        assert model is InvoiceSheet
        return FakeQuery(self.sheets)


class FakeDisbursementSession(FakeSession):
    def flush(self):
        self.entities[-1].id = len(self.entities) + 1


def test_ejecutar_desembolso_exitoso(monkeypatch):
    session = FakeSession()
    use_case = EjecutarDesembolsoUseCase(db_session=session)
    notifications = []

    monkeypatch.setattr(use_case, "validar_empresa", lambda ruc: True)
    monkeypatch.setattr(
        use_case,
        "ejecutar_transferencia",
        lambda data: {"estado": "TRANSFERENCIA_EXITOSA"},
    )
    monkeypatch.setattr(
        use_case,
        "publicar_notificacion",
        lambda **payload: notifications.append(payload),
    )

    result = use_case.ejecutar(
        {
            "ruc": "20123456789",
            "sheet_id": 12,
            "annotation_code": "ANOT001",
            "amount": 8000,
            "currency": "PEN",
            "bank_name": "Banco de Crédito",
            "bank_account_number": "1234567890",
            "cci": "00212345678901234567",
        }
    )

    assert result == {"status": "Desembolso registrado", "id": 5}
    assert session.entities[0].amount == 8000
    assert len(notifications) == 2
    assert session.committed
    assert session.closed


def test_ejecutar_desembolso_masivo_actualiza_planillas_y_registra_desembolsos():
    sheets = {
        sheet_id: InvoiceSheet(
            id=sheet_id,
            company_id=3,
            sheet_code=sheet_code,
            currency="PEN",
            total_amount=128450,
            advance_amount=0,
            interest_fee=0,
            commission=0,
            net_disbursement=0,
            advance_rate=0,
            monthly_rate=0,
            status="REGISTRADO",
            created_at="2026-09-30",
        )
        for sheet_id, sheet_code in (
            (2, "PLA-2026-0185"),
            (3, "PLA-2026-0385"),
        )
    }
    venta_session = FakeVentaSession(sheets)
    desembolso_session = FakeDisbursementSession()
    result = EjecutarDesembolsoMasivoUseCase(
        venta_db_session=venta_session,
        desembolso_db_session=desembolso_session,
    ).ejecutar(
        {
            "user_id": 5,
            "company_id": 3,
            "phone": "954923087",
            "bank_name": "BCP",
            "bank_account_number": "1912656212",
            "cci": "20261912656212001",
            "currency": "PEN",
            "email": "cliente@example.com",
            "planillas": [
                {
                    "id_planilla": 2,
                    "numero_planilla": "PLA-2026-0185",
                    "importe": "128,450.00",
                    "tasa_descuento": "0.15",
                    "tasa_comision": "0.02",
                },
                {
                    "id_planilla": 3,
                    "numero_planilla": "PLA-2026-0385",
                    "importe": "128,450.00",
                    "tasa_descuento": "0.15",
                    "tasa_comision": "0.02",
                },
            ],
        }
    )

    assert result == [
        {
            "disbursement_id": 2,
            "annotation_code": "ANOT-PLA-2026-0185",
            "status": "Planilla Desembolsada",
            "disbursement_amount": 106613.5,
        },
        {
            "disbursement_id": 3,
            "annotation_code": "ANOT-PLA-2026-0385",
            "status": "Planilla Desembolsada",
            "disbursement_amount": 106613.5,
        },
    ]
    for sheet in sheets.values():
        assert sheet.advance_amount == pytest.approx(19267.5)
        assert sheet.commission == pytest.approx(2569.0)
        assert sheet.net_disbursement == pytest.approx(106613.5)
        assert sheet.advance_rate == pytest.approx(0.15)
        assert sheet.monthly_rate == pytest.approx(0.02)
        assert sheet.status == "DESEMBOLSADO"

    disbursements = desembolso_session.entities
    assert all(isinstance(item, Disbursement) for item in disbursements)
    assert [item.amount for item in disbursements] == pytest.approx([106613.5, 106613.5])
    assert [item.sheet_id for item in disbursements] == [2, 3]
    assert [item.annotation_code for item in disbursements] == [
        "ANOT-PLA-2026-0185",
        "ANOT-PLA-2026-0385",
    ]
    assert all(item.currency == "PEN" for item in disbursements)
    assert all(item.bank_name == "BCP" for item in disbursements)
    assert all(item.bank_account_number == "1912656212" for item in disbursements)
    assert all(item.cci == "20261912656212001" for item in disbursements)
    assert venta_session.committed
    assert desembolso_session.committed
    assert venta_session.closed
    assert desembolso_session.closed


def test_ejecutar_desembolso_masivo_hace_rollback_si_planilla_no_existe():
    venta_session = FakeVentaSession({})
    desembolso_session = FakeDisbursementSession()

    with pytest.raises(ValueError, match="No existe la planilla con ID 99"):
        EjecutarDesembolsoMasivoUseCase(
            venta_db_session=venta_session,
            desembolso_db_session=desembolso_session,
        ).ejecutar(
            {
                "currency": "PEN",
                "bank_name": "BCP",
                "bank_account_number": "123",
                "cci": "456",
                "planillas": [
                    {
                        "id_planilla": 99,
                        "numero_planilla": "PLA-99",
                        "importe": "100.00",
                        "tasa_descuento": "0.15",
                        "tasa_comision": "0.02",
                    }
                ],
            }
        )

    assert not venta_session.committed
    assert not desembolso_session.committed
    assert venta_session.closed
    assert desembolso_session.closed


def test_ejecutar_desembolso_rechaza_empresa_no_valida(monkeypatch):
    session = FakeSession()
    use_case = EjecutarDesembolsoUseCase(db_session=session)
    monkeypatch.setattr(use_case, "validar_empresa", lambda ruc: False)

    result = use_case.ejecutar({"ruc": "20123456789"})

    assert result == {"error": "Empresa no válida en SUNAT"}
    assert session.entities == []
    assert session.closed
