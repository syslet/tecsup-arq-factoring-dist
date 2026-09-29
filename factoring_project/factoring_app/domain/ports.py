# factoring/domain/ports.py
from abc import ABC, abstractmethod
from factoring_app.domain.entities import User, Company, InvoiceSheet, Invoice, Disbursement

# Repositorios
class UserRepositoryPort(ABC):
    @abstractmethod
    def guardar_usuario(self, user: User): pass

    @abstractmethod
    def obtener_usuario(self, id: int): pass


class CompanyRepositoryPort(ABC):
    @abstractmethod
    def guardar_empresa(self, company: Company): pass

    @abstractmethod
    def obtener_empresa(self, ruc: str): pass


class InvoiceSheetRepositoryPort(ABC):
    @abstractmethod
    def guardar_planilla(self, sheet: InvoiceSheet): pass

    @abstractmethod
    def obtener_planilla(self, code: str): pass


class InvoiceRepositoryPort(ABC):
    @abstractmethod
    def guardar_factura(self, invoice: Invoice): pass

    @abstractmethod
    def obtener_factura(self, id: int): pass


class DisbursementRepositoryPort(ABC):
    @abstractmethod
    def guardar_desembolso(self, disbursement: Disbursement): pass

    @abstractmethod
    def obtener_desembolso(self, sheet_id: int): pass


# Servicios externos
class ValidacionExternaPort(ABC):
    @abstractmethod
    def validar_factura(self, invoice: Invoice): pass

    @abstractmethod
    def validar_empresa(self, ruc: str): pass


class PricingPort(ABC):
    @abstractmethod
    def calcular_pricing(self, total_amount: float, advance_amount: float) -> dict:
        """Contrato para calcular pricing"""
        pass


class BancoPort(ABC):
    @abstractmethod
    def transferir_monto(self, cuenta: str, monto: float): pass


class NotificacionPort(ABC):
    @abstractmethod
    def enviar_notificacion(self, destinatario: str, mensaje: str): pass
