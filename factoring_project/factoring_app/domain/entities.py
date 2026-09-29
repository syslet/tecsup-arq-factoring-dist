from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Boolean, Text, TIMESTAMP, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    dni = Column(String(20), nullable=False)
    phone = Column(String(20), nullable=False)
    verification_status = Column(String, nullable=True)

    companies = relationship("Company", back_populates="legal_representative")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    ruc = Column(String(11), unique=True, nullable=False)
    business_name = Column(String(255), nullable=False)
    legal_representative_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bank_name = Column(String(100), nullable=False)
    bank_account_number = Column(String(50), nullable=False)
    cci = Column(String(20), nullable=False)
    currency = Column(String(10), nullable=False)

    legal_representative = relationship("User", back_populates="companies")
    documents = relationship("CompanyDocument", back_populates="company", cascade="all, delete-orphan")


class CompanyDocument(Base):
    __tablename__ = "company_documents"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(50), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_at = Column(TIMESTAMP, nullable=False)

    company = relationship("Company", back_populates="documents")


class InvoiceSheet(Base):
    __tablename__ = "invoice_sheets"

    id = Column(Integer, primary_key=True, index=True)
    # La empresa vive en la BD de Registro; aquí solo se conserva su identificador.
    company_id = Column(Integer, nullable=False)
    sheet_code = Column(String(50), unique=True, nullable=False)
    currency = Column(String(10), nullable=False, default="PEN")
    total_amount = Column(Float, nullable=False)
    advance_amount = Column(Float, nullable=False)
    interest_fee = Column(Float, nullable=False)
    commission = Column(Float, nullable=False)
    net_disbursement = Column(Float, nullable=False)
    advance_rate = Column(Float, nullable=False, default=0.85)
    monthly_rate = Column(Float, nullable=False, default=0.02)
    status = Column(String(50), nullable=False, default="QUOTED")
    created_at = Column(TIMESTAMP, nullable=False)

    invoices = relationship("Invoice", back_populates="sheet", cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    # La planilla vive en la BD de Venta; aquí solo se conserva su identificador.
    sheet_id = Column(Integer, ForeignKey("invoice_sheets.id", ondelete="CASCADE"), nullable=False)
    invoice_number = Column(String(50), nullable=False)
    drawer_ruc = Column(String(11), nullable=False)
    debtor_ruc = Column(String(11), nullable=False)
    debtor_name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    days_to_maturity = Column(Integer, nullable=False)
    sunat_status = Column(String(20), nullable=False, default="VALID")
    is_approved = Column(Boolean, nullable=False, default=True)
    rejection_reason = Column(Text)

    sheet = relationship("InvoiceSheet", back_populates="invoices")


class Disbursement(Base):
    __tablename__ = "disbursements"

    id = Column(Integer, primary_key=True, index=True)
    # La planilla vive en la BD de Venta; aquí solo se conserva su identificador.
    sheet_id = Column(Integer, nullable=False)
    annotation_code = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False)
    bank_name = Column(String(100), nullable=False)
    bank_account_number = Column(String(50), nullable=False)
    cci = Column(String(20), nullable=False)



class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    total_amount = Column(Float, nullable=False)
    advance_amount = Column(Float, nullable=False)
    advance_rate = Column(Float, nullable=False)
    pricing_rate = Column(Float, nullable=False)
    pricing_timestamp = Column(String(50), nullable=False)  # ISO string
    monto_final = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    