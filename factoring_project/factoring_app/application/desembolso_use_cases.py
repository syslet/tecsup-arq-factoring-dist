from decimal import Decimal, InvalidOperation

import requests
from factoring_app.domain.entities import Disbursement, InvoiceSheet
from factoring_app.infrastructure.db_config import (
    DesembolsoSessionLocal,
    VentaSessionLocal,
)

SUNAT_URL = "http://sunat_service:6000"
BANK_URL = "http://bank_service:6300"
NOTIF_KAFKA_URL = "http://notification_kafka_adapter:6500/notificar"


class EjecutarDesembolsoMasivoUseCase:
    def __init__(self, venta_db_session=None, desembolso_db_session=None):
        self.venta_db = venta_db_session or VentaSessionLocal()
        self.desembolso_db = desembolso_db_session or DesembolsoSessionLocal()

    @staticmethod
    def _decimal(value, field_name: str) -> Decimal:
        try:
            amount = Decimal(str(value).replace(",", ""))
        except (InvalidOperation, TypeError, ValueError) as error:
            raise ValueError(f"El campo {field_name} debe ser numérico.") from error
        if not amount.is_finite():
            raise ValueError(f"El campo {field_name} debe ser numérico.")
        return amount

    def ejecutar(self, data: dict) -> list[dict]:
        try:
            planillas = data.get("planillas")
            if not isinstance(planillas, list) or not planillas:
                raise ValueError("Debe proporcionar al menos una planilla.")

            resultados = []
            for planilla_data in planillas:
                if not isinstance(planilla_data, dict):
                    raise ValueError("Cada planilla debe ser un objeto.")

                try:
                    sheet_id = int(planilla_data["id_planilla"])
                    sheet_code = planilla_data["numero_planilla"]
                    if not isinstance(sheet_code, str) or not sheet_code.strip():
                        raise ValueError("El numero_planilla debe ser texto.")
                    amount = self._decimal(planilla_data["importe"], "importe")
                    discount_rate = self._decimal(
                        planilla_data["tasa_descuento"], "tasa_descuento"
                    )
                    commission_rate = self._decimal(
                        planilla_data["tasa_comision"], "tasa_comision"
                    )
                except (KeyError, TypeError, ValueError) as error:
                    raise ValueError(
                        "La planilla contiene campos faltantes o inválidos."
                    ) from error

                advance_amount = amount * discount_rate
                commission = amount * commission_rate
                net_disbursement = (amount - advance_amount - commission)
                sheet = (
                    self.venta_db.query(InvoiceSheet)
                    .filter(InvoiceSheet.id == sheet_id)
                    .one_or_none()
                )
                if sheet is None:
                    raise ValueError(f"No existe la planilla con ID {sheet_id}.")

                sheet.advance_amount = float(advance_amount)
                sheet.commission = float(commission)
                sheet.net_disbursement = float(net_disbursement)
                sheet.advance_rate = float(discount_rate)
                sheet.monthly_rate = float(commission_rate)
                sheet.status = "DESEMBOLSADO"

                disbursement = Disbursement(
                    sheet_id=sheet_id,
                    annotation_code=f"ANOT-{sheet_code}",
                    amount=float(net_disbursement),
                    currency=data["currency"],
                    bank_name=data["bank_name"],
                    bank_account_number=data["bank_account_number"],
                    cci=data["cci"],
                )
                self.desembolso_db.add(disbursement)
                self.desembolso_db.flush()
                resultados.append(
                    {
                        "disbursement_id": disbursement.id,
                        "annotation_code": disbursement.annotation_code,
                        "status": "Planilla Desembolsada",
                        "disbursement_amount": disbursement.amount,
                    }
                )

            self.venta_db.commit()
            self.desembolso_db.commit()
            return resultados
        except Exception:
            self.venta_db.rollback()
            self.desembolso_db.rollback()
            raise
        finally:
            self.venta_db.close()
            self.desembolso_db.close()


class EjecutarDesembolsoUseCase:
    def __init__(self, disbursement_repo=None, db_session=None,
                 banco_service=None, notificacion_service=None):
        self.db = db_session or DesembolsoSessionLocal()
        self.disbursement_repo = disbursement_repo

    def validar_empresa(self, ruc: str) -> bool:
        """Valida empresa en SUNAT antes de desembolsar"""
        resp = requests.post(f"{SUNAT_URL}/validar/empresa", json={"ruc": ruc})
        data = resp.json()
        return data.get("estado") == "VALID"

    def ejecutar_transferencia(self, data: dict) -> dict:
        """Ejecuta la transferencia bancaria"""
        resp = requests.post(f"{BANK_URL}/banco/desembolso", json=data)
        return resp.json()

    def publicar_notificacion(self, tipo: str, destinatario: str, mensaje: str, extra: dict = None):
        """Publica evento de notificación en Kafka vía el adaptador HTTP"""
        payload = {
            "type": tipo,
            "destinatario": destinatario,
            "mensaje": mensaje,
            "extra": extra or {}
        }
        try:
            requests.post(NOTIF_KAFKA_URL, json=payload)
        except Exception as e:
            # No detiene el flujo de desembolso, solo registra el fallo
            print(f"Error al publicar notificación en Kafka: {e}")

    def ejecutar(self, data: dict) -> dict:
        try:
            # 1. Validar empresa
            if not self.validar_empresa(data["ruc"]):
                return {"error": "Empresa no válida en SUNAT"}

            # 2. Transferencia bancaria
            resultado = self.ejecutar_transferencia(data)
            if resultado.get("estado") != "TRANSFERENCIA_EXITOSA":
                return {"error": "Fallo en la transferencia bancaria"}

            # 3. Guardar desembolso
            desembolso = Disbursement(
                sheet_id=data["sheet_id"],
                annotation_code=data["annotation_code"],
                amount=data["amount"],
                currency=data["currency"],
                bank_name=data["bank_name"],
                bank_account_number=data["bank_account_number"],
                cci=data["cci"]
            )
            self.db.add(desembolso)
            self.db.commit()
            self.db.refresh(desembolso)

            # 4. Publicar notificaciones en Kafka
            mensaje = f"Se desembolsó el monto {data['amount']} {data['currency']} a la cuenta {data['bank_account_number']}"
            self.publicar_notificacion(
                tipo="email",
                destinatario=data.get("destinatario", "admin@example.com"),
                mensaje=mensaje,
                extra={"sheet_id": data["sheet_id"], "annotation_code": data["annotation_code"]}
            )
            self.publicar_notificacion(
                tipo="sms",
                destinatario=data.get("telefono", "+51999999999"),
                mensaje=mensaje,
                extra={"sheet_id": data["sheet_id"], "annotation_code": data["annotation_code"]}
            )

            return {"status": "Desembolso registrado", "id": desembolso.id}

        except Exception as e:
            self.db.rollback()
            return {"error": f"Error en el desembolso: {str(e)}"}

        finally:
            self.db.close()
