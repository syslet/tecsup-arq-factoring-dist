import requests
from flask import Flask, request, jsonify
from datetime import datetime

from factoring_app.infrastructure.db_config import (
    DesembolsoSessionLocal,
    RegistroSessionLocal,
    VentaSessionLocal,
)
from factoring_app.domain.entities import User, Company, CompanyDocument, InvoiceSheet, Invoice, Disbursement
from factoring_app.application.desembolso_use_cases import EjecutarDesembolsoUseCase

app = Flask(__name__)

SUNAT_URL = "http://sunat_service:6000"
BANK_URL = "http://bank_service:6300"

# =========================
# Endpoints de registro y negocio
# =========================

@app.route("/registro/usuario", methods=["POST"])
def registrar_usuario():
    data = request.json
    db = RegistroSessionLocal()
    try:
        usuario = User(**data)
        db.add(usuario)
        db.commit()
        return jsonify({"status": "Usuario registrado", "id": usuario.id})
    finally:
        db.close()


@app.route("/registro/empresa", methods=["POST"])
def registrar_empresa():
    data = request.json
    resp = requests.post(f"{SUNAT_URL}/validar/empresa", json={"ruc": data["ruc"]})
    if resp.json()["estado"] != "VALID":
        return jsonify({"error": "Empresa no válida"}), 400

    db = RegistroSessionLocal()
    try:
        empresa = Company(**data)
        db.add(empresa)
        db.commit()
        return jsonify({"status": "Empresa registrada", "id": empresa.id})
    finally:
        db.close()


@app.route("/registro/documento", methods=["POST"])
def registrar_documento():
    data = request.json
    db = RegistroSessionLocal()
    try:
        documento = CompanyDocument(
            company_id=data["company_id"],
            document_type=data["document_type"],
            file_name=data["file_name"],
            file_path=data["file_path"],
            uploaded_at=datetime.now()
        )
        db.add(documento)
        db.commit()
        return jsonify({"status": "Documento registrado", "id": documento.id})
    finally:
        db.close()


@app.route("/venta/planilla", methods=["POST"])
def registrar_planilla():
    data = request.json
    db = VentaSessionLocal()

    try:
        # 1. Recuperar último pricing desde RabbitMQ
        from pricing_rabbitmq_adapter.pricing_rabbitmq_service import get_latest_pricing
        pricing_event = get_latest_pricing()
        if "error" in pricing_event:
            return jsonify({"error": "No se pudo obtener el pricing desde RabbitMQ"}), 400

        advance_rate = pricing_event.get("advance_rate")
        monthly_rate = pricing_event.get("monthly_rate")

        # 2. Calcular campos derivados
        total_amount = data["total_amount"]
        advance_amount = total_amount - (total_amount * advance_rate)
        interest_fee = advance_amount * monthly_rate
        commission = total_amount * advance_rate
        net_disbursement = total_amount - interest_fee - commission

        # 3. Crear la planilla
        sheet = InvoiceSheet(
            company_id=data["company_id"],
            sheet_code=data["sheet_code"],
            currency=data.get("currency", "PEN"),
            total_amount=total_amount,
            advance_amount=advance_amount,
            interest_fee=interest_fee,
            commission=commission,
            net_disbursement=net_disbursement,
            advance_rate=advance_rate,
            monthly_rate=monthly_rate,
            status=data.get("status", "QUOTED"),
            created_at=datetime.now()
        )
        db.add(sheet)
        db.commit()
        db.refresh(sheet)

        # 4. Registrar facturas asociadas
        if "invoices" in data:
            for inv in data["invoices"]:
                factura = Invoice(sheet_id=sheet.id, **inv)
                db.add(factura)
            db.commit()

        return jsonify({
            "status": "Planilla registrada con facturas",
            "id": sheet.id,
            "advance_rate": advance_rate,
            "monthly_rate": monthly_rate,
            "advance_amount": advance_amount,
            "interest_fee": interest_fee,
            "commission": commission,
            "net_disbursement": net_disbursement
        })

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 400
    finally:
        db.close()


@app.route("/desembolso", methods=["POST"])
def ejecutar_desembolso():
    data = request.json
    use_case = EjecutarDesembolsoUseCase(db_session=DesembolsoSessionLocal())
    resultado = use_case.ejecutar(data)
    if "error" in resultado:
        return jsonify(resultado), 400
    return jsonify(resultado)
