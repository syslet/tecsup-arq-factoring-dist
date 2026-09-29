import pytest

from factoring_app.application.registro_use_cases import (
    RegistrarEmpresaUseCase,
    RegistrarUsuarioUseCase,
)
from factoring_app.domain.entities import Company, User


class FakeUserRepository:
    def guardar_usuario(self, user):
        user.id = 10
        return user


class FakeCompanyRepository:
    def guardar_empresa(self, company):
        company.id = 20
        return company


class FakeNotificationService:
    def __init__(self):
        self.notifications = []

    def enviar_notificacion(self, destinatario, mensaje):
        self.notifications.append((destinatario, mensaje))


class FakeValidationService:
    def __init__(self, valid=True):
        self.valid = valid

    def validar_empresa(self, ruc):
        return self.valid


def test_registrar_usuario_guarda_y_notifica():
    notifications = FakeNotificationService()
    user = User(
        email="ana@example.com",
        password_hash="hash",
        full_name="Ana Perez",
        dni="12345678",
        phone="999999999",
    )

    result = RegistrarUsuarioUseCase(
        FakeUserRepository(), notifications
    ).ejecutar(user)

    assert result.id == 10
    assert notifications.notifications == [
        ("ana@example.com", "Registro exitoso. Bienvenido al sistema de Factoring.")
    ]


def test_registrar_empresa_valida_y_guarda():
    company = Company(
        ruc="20123456789",
        business_name="Empresa SAC",
        legal_representative_user_id=10,
        bank_name="Banco de Crédito",
        bank_account_number="1234567890",
        cci="00212345678901234567",
        currency="PEN",
    )

    result = RegistrarEmpresaUseCase(
        FakeCompanyRepository(), FakeValidationService()
    ).ejecutar(company)

    assert result.id == 20
    assert result.ruc == "20123456789"


def test_registrar_empresa_rechaza_empresa_no_valida():
    company = Company(
        ruc="20123456789",
        business_name="Empresa SAC",
        legal_representative_user_id=10,
        bank_name="Banco de Crédito",
        bank_account_number="1234567890",
        cci="00212345678901234567",
        currency="PEN",
    )

    with pytest.raises(ValueError, match="Empresa no válida según SUNAT"):
        RegistrarEmpresaUseCase(
            FakeCompanyRepository(), FakeValidationService(valid=False)
        ).ejecutar(company)
