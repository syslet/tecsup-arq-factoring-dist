from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from factoring_app.domain.entities import InvoiceSheet, Sale, Invoice
from factoring_app.infrastructure.db_config import VentaSessionLocal
from pricing_rabbitmq_adapter.pricing_rabbitmq_service import get_latest_pricing


class ImportarPlanillaUseCase:
    def ejecutar(self, company_id: int, planillas: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not planillas:
            raise ValueError("El BODY debe contener al menos una planilla.")

        db = VentaSessionLocal()
        try:
            resultados = []
            today = date.today()

            for planilla_data in planillas:
                if not isinstance(planilla_data, dict):
                    raise ValueError("Cada elemento debe ser una planilla.")

                sheet_code = planilla_data.get("numero_planilla")
                invoice_data_list = planilla_data.get("facturas")
                if not sheet_code or not isinstance(invoice_data_list, list) or not invoice_data_list:
                    raise ValueError(
                        "Cada planilla debe incluir numero_planilla y al menos una factura."
                    )

                invoices = []
                total_amount = Decimal("0")
                for invoice_data in invoice_data_list:
                    if not isinstance(invoice_data, dict):
                        raise ValueError("Cada factura debe ser un objeto.")
                    try:
                        amount = Decimal(str(invoice_data["importe"]).replace(",", ""))
                        issue_date = datetime.strptime(
                            invoice_data["fech_emision"], "%d/%m/%Y"
                        ).date()
                        due_date = datetime.strptime(
                            invoice_data["fecha_vencimiento"], "%d/%m/%Y"
                        ).date()
                        invoice = Invoice(
                            invoice_number=invoice_data["numero_factura"],
                            drawer_ruc=invoice_data["ruc_girador"],
                            debtor_ruc=invoice_data["ruc_aceptante"],
                            debtor_name=invoice_data["nombre_aceptante"],
                            amount=float(amount),
                            currency=invoice_data["moneda"],
                            issue_date=issue_date,
                            due_date=due_date,
                            days_to_maturity=(due_date - today).days,
                            sunat_status="VALID",
                            is_approved=True,
                            rejection_reason="",
                        )
                    except (KeyError, InvalidOperation, TypeError, ValueError) as error:
                        raise ValueError(
                            "La factura contiene campos faltantes o datos inválidos."
                        ) from error
                    if not amount.is_finite():
                        raise ValueError("El importe de cada factura debe ser válido.")

                    total_amount += amount
                    invoices.append(invoice)

                sheet = InvoiceSheet(
                    company_id=company_id,
                    sheet_code=sheet_code,
                    currency=invoices[0].currency,
                    total_amount=float(total_amount),
                    advance_amount=0,
                    interest_fee=0,
                    commission=0,
                    net_disbursement=0,
                    advance_rate=0,
                    monthly_rate=0,
                    status="REGISTRADO",
                    created_at=datetime.now(),
                )
                sheet.invoices.extend(invoices)
                db.add(sheet)
                db.flush()
                resultados.append(
                    {
                        "id": sheet.id,
                        "numero_planilla": sheet_code,
                        "status": "Planilla registrada con facturas",
                    }
                )

            db.commit()
            return resultados
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


class RegistrarPlanillaUseCase:
    def __init__(self, sheet_repo=None, invoice_repo=None, validacion_service=None):
        self.sheet_repo = sheet_repo
        self.invoice_repo = invoice_repo
        self.validacion_service = validacion_service

    def ejecutar(self, planilla: InvoiceSheet, invoices: list = None):
        db = VentaSessionLocal()
        try:
            # 1. Recuperar último pricing desde RabbitMQ
            pricing_event = get_latest_pricing()
            if "error" in pricing_event:
                raise ValueError("No se pudo obtener el pricing desde RabbitMQ")

            advance_rate = pricing_event.get("advance_rate")
            monthly_rate = pricing_event.get("monthly_rate")

            # 2. Calcular campos derivados
            total_amount = planilla.total_amount
            planilla.advance_rate = advance_rate
            planilla.monthly_rate = monthly_rate
            planilla.advance_amount = total_amount - (total_amount * advance_rate)
            planilla.interest_fee = planilla.advance_amount * monthly_rate
            planilla.commission = total_amount * advance_rate
            planilla.net_disbursement = total_amount - planilla.interest_fee - planilla.commission

            # 3. Validar facturas con SUNAT
            if invoices:
                for factura in invoices:
                    if self.validacion_service and not self.validacion_service.validar_factura(factura):
                        raise ValueError(f"Factura inválida: {factura.invoice_number}")
                    db.add(factura)

            # 4. Guardar planilla
            db.add(planilla)

            # 5. Guardar registro en tabla sales
            venta = Sale(
                total_amount=total_amount,
                advance_amount=planilla.advance_amount,
                advance_rate=advance_rate,
                pricing_rate=monthly_rate,
                pricing_timestamp=pricing_event.get("timestamp"),
                monto_final=planilla.net_disbursement
            )
            db.add(venta)

            print(f"[DEBUG] Insertando venta en sales: total={venta.total_amount}, advance={venta.advance_amount}, rate={venta.advance_rate}")

            # 6. Commit conjunto
            db.commit()
            db.refresh(planilla)
            db.refresh(venta)

            return {
                "status": "Planilla y venta registradas",
                "planilla_id": planilla.id,
                "sale_id": venta.id,
                "advance_rate": advance_rate,
                "monthly_rate": monthly_rate,
                "advance_amount": planilla.advance_amount,
                "interest_fee": planilla.interest_fee,
                "commission": planilla.commission,
                "net_disbursement": planilla.net_disbursement
            }

        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()


class ConsultarPlanillaUseCase:
    def ejecutar(self, company_id: int, status: str | None = None):
        db = VentaSessionLocal()
        try:
            query = (
                db.query(
                    InvoiceSheet.id.label("invoice_sheet_id"),
                    InvoiceSheet.created_at.label("created_at"),
                    InvoiceSheet.sheet_code.label("sheet_code"),
                    Invoice.id.label("invoice_id"),
                    Invoice.invoice_number.label("invoice_number"),
                    Invoice.debtor_ruc.label("debtor_ruc"),
                    Invoice.debtor_name.label("debtor_name"),
                    Invoice.amount.label("amount"),
                    Invoice.currency.label("currency"),
                    InvoiceSheet.status.label("status"),
                )
                .join(Invoice, Invoice.sheet_id == InvoiceSheet.id)
                .filter(InvoiceSheet.company_id == company_id)
            )
            if status is not None:
                query = query.filter(InvoiceSheet.status == status)

            return [dict(row._mapping) for row in query.all()]
        finally:
            db.close()
