from factoring_app.application.desembolso_use_cases import EjecutarDesembolsoUseCase


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


def test_ejecutar_desembolso_rechaza_empresa_no_valida(monkeypatch):
    session = FakeSession()
    use_case = EjecutarDesembolsoUseCase(db_session=session)
    monkeypatch.setattr(use_case, "validar_empresa", lambda ruc: False)

    result = use_case.ejecutar({"ruc": "20123456789"})

    assert result == {"error": "Empresa no válida en SUNAT"}
    assert session.entities == []
    assert session.closed
