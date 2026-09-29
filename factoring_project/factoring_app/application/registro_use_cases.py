# factoring/application/registro_use_cases.py
from factoring_app.domain.entities import User, Company

class RegistrarUsuarioUseCase:
    def __init__(self, user_repo, notificacion_service):
        self.user_repo = user_repo
        self.notificacion_service = notificacion_service

    def ejecutar(self, user: User):
        usuario = self.user_repo.guardar_usuario(user)
        self.notificacion_service.enviar_notificacion(
            usuario.email, "Registro exitoso. Bienvenido al sistema de Factoring."
        )
        return usuario


class RegistrarEmpresaUseCase:
    def __init__(self, company_repo, validacion_service):
        self.company_repo = company_repo
        self.validacion_service = validacion_service

    def ejecutar(self, company: Company):
        if self.validacion_service.validar_empresa(company.ruc):
            empresa = self.company_repo.guardar_empresa(company)
            return empresa
        else:
            raise ValueError("Empresa no válida según SUNAT")
