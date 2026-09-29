# factoring_app/infrastructure/repositories.py
from factoring_app.domain.entities import User, Company, InvoiceSheet, Invoice, Disbursement
from factoring_app.domain.ports import (
    UserRepositoryPort, CompanyRepositoryPort,
    InvoiceSheetRepositoryPort, InvoiceRepositoryPort,
    DisbursementRepositoryPort
)

class UserRepositorySQLAlchemy(UserRepositoryPort):
    def __init__(self, db):
        self.db = db

    def guardar_usuario(self, user: User):
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def obtener_usuario(self, id: int):
        return self.db.query(User).filter(User.id == id).first()


class CompanyRepositorySQLAlchemy(CompanyRepositoryPort):
    def __init__(self, db):
        self.db = db

    def guardar_empresa(self, company: Company):
        self.db.add(company)
        self.db.commit()
        self.db.refresh(company)
        return company

    def obtener_empresa(self, ruc: str):
        return self.db.query(Company).filter(Company.ruc == ruc).first()


class InvoiceSheetRepositorySQLAlchemy(InvoiceSheetRepositoryPort):
    def __init__(self, db):
        self.db = db

    def guardar_planilla(self, sheet: InvoiceSheet):
        self.db.add(sheet)
        self.db.commit()
        self.db.refresh(sheet)
        return sheet

    def obtener_planilla(self, code: str):
        return self.db.query(InvoiceSheet).filter(InvoiceSheet.sheet_code == code).first()


class InvoiceRepositorySQLAlchemy(InvoiceRepositoryPort):
    def __init__(self, db):
        self.db = db

    def guardar_factura(self, invoice: Invoice):
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def obtener_factura(self, id: int):
        return self.db.query(Invoice).filter(Invoice.id == id).first()


class DisbursementRepositorySQLAlchemy(DisbursementRepositoryPort):
    def __init__(self, db):
        self.db = db

    def guardar_desembolso(self, disbursement: Disbursement):
        self.db.add(disbursement)
        self.db.commit()
        self.db.refresh(disbursement)
        return disbursement

    def obtener_desembolso(self, sheet_id: int):
        return self.db.query(Disbursement).filter(Disbursement.sheet_id == sheet_id).first()
