from datetime import datetime

from flask import Flask, jsonify, request

from factoring_app.application.venta_use_cases import (
    ConsultarPlanillaUseCase,
    ImportarPlanillaUseCase,
)
from factoring_app.domain.entities import Invoice, InvoiceSheet
from factoring_app.infrastructure.db_config import VentaSessionLocal, init_venta_db
from pricing_rabbitmq_adapter.pricing_rabbitmq_service import get_latest_pricing


def create_app(initialize_database: bool = False) -> Flask:
    app = Flask(__name__)
    if initialize_database:
        init_venta_db()

    @app.post("/venta/planilla")
    def registrar_planilla():
        data = request.get_json(silent=True) or {}
        db = VentaSessionLocal()
        try:
            pricing_event = get_latest_pricing()
            if "error" in pricing_event:
                return jsonify({"error": "No se pudo obtener el pricing desde RabbitMQ"}), 400

            advance_rate = pricing_event["advance_rate"]
            monthly_rate = pricing_event["monthly_rate"]
            total_amount = data["total_amount"]
            advance_amount = total_amount - (total_amount * advance_rate)
            interest_fee = advance_amount * monthly_rate
            commission = total_amount * advance_rate
            net_disbursement = total_amount - interest_fee - commission

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
                created_at=datetime.now(),
            )
            db.add(sheet)
            db.flush()
            for invoice_data in data.get("invoices", []):
                db.add(Invoice(sheet_id=sheet.id, **invoice_data))

            db.commit()
            db.refresh(sheet)
            return jsonify(
                {
                    "status": "Planilla registrada con facturas",
                    "id": sheet.id,
                    "advance_rate": advance_rate,
                    "monthly_rate": monthly_rate,
                    "advance_amount": advance_amount,
                    "interest_fee": interest_fee,
                    "commission": commission,
                    "net_disbursement": net_disbursement,
                }
            ), 201
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @app.post("/venta/planilla/importar")
    def importar_planilla():
        company_id_param = request.args.get("companyId")
        if company_id_param is None:
            return jsonify({"error": "El parámetro companyId es obligatorio."}), 400
        try:
            company_id = int(company_id_param)
        except ValueError:
            return jsonify({"error": "El parámetro companyId debe ser un entero."}), 400
        if company_id <= 0:
            return jsonify({"error": "El parámetro companyId debe ser mayor que cero."}), 400

        planillas = request.get_json(silent=True)
        if not isinstance(planillas, list):
            return jsonify({"error": "El BODY debe ser un arreglo de planillas."}), 400

        try:
            resultados = ImportarPlanillaUseCase().ejecutar(company_id, planillas)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        return jsonify(resultados), 200

    @app.get("/venta/planillas")
    def consultar_planillas():
        company_id_param = request.args.get("company_id")
        if company_id_param is None:
            return jsonify({"error": "El parámetro company_id es obligatorio."}), 400

        try:
            company_id = int(company_id_param)
        except ValueError:
            return jsonify({"error": "El parámetro company_id debe ser un entero."}), 400
        if company_id <= 0:
            return jsonify({"error": "El parámetro company_id debe ser mayor que cero."}), 400

        status = request.args.get("status")
        if status is not None:
            status = status.strip()
            if not status:
                return jsonify({"error": "El parámetro status no puede estar vacío."}), 400

        planillas = ConsultarPlanillaUseCase().ejecutar(company_id, status)
        if not planillas:
            return jsonify({"error": "No se encontraron planillas para la empresa."}), 404

        return jsonify({"planillas": planillas}), 200

    return app


app = create_app()
