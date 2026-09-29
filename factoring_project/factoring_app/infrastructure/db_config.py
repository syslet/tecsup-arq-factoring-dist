import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from factoring_app.domain.entities import (
    Base,
    Company,
    CompanyDocument,
    Disbursement,
    Invoice,
    InvoiceSheet,
    Sale,
    User,
)


def _database_url(name: str, default: str) -> str:
    return os.getenv(name, default)


REGISTRO_DATABASE_URL = _database_url(
    "REGISTRO_DATABASE_URL",
    "postgresql+psycopg2://factoring_user:factoring_pass@localhost:5433/registro_db",
)
VENTA_DATABASE_URL = _database_url(
    "VENTA_DATABASE_URL",
    "postgresql+psycopg2://factoring_user:factoring_pass@localhost:5434/venta_db",
)
DESEMBOLSO_DATABASE_URL = _database_url(
    "DESEMBOLSO_DATABASE_URL",
    "postgresql+psycopg2://factoring_user:factoring_pass@localhost:5435/desembolso_db",
)

registro_engine = create_engine(REGISTRO_DATABASE_URL)
venta_engine = create_engine(VENTA_DATABASE_URL)
desembolso_engine = create_engine(DESEMBOLSO_DATABASE_URL)

RegistroSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=registro_engine, expire_on_commit=False
)
VentaSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=venta_engine, expire_on_commit=False
)
DesembolsoSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=desembolso_engine, expire_on_commit=False
)


def init_db() -> None:
    """Crea únicamente las tablas que pertenecen a cada caso de uso."""
    Base.metadata.create_all(
        bind=registro_engine,
        tables=[User.__table__, Company.__table__, CompanyDocument.__table__],
    )
    Base.metadata.create_all(
        bind=venta_engine,
        tables=[InvoiceSheet.__table__, Invoice.__table__, Sale.__table__],
    )
    Base.metadata.create_all(bind=desembolso_engine, tables=[Disbursement.__table__])


def init_registro_db() -> None:
    Base.metadata.create_all(
        bind=registro_engine,
        tables=[User.__table__, Company.__table__, CompanyDocument.__table__],
    )


def init_venta_db() -> None:
    Base.metadata.create_all(
        bind=venta_engine,
        tables=[InvoiceSheet.__table__, Invoice.__table__, Sale.__table__],
    )


def init_desembolso_db() -> None:
    Base.metadata.create_all(bind=desembolso_engine, tables=[Disbursement.__table__])
