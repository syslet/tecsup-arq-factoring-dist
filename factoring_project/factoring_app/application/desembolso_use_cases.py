import requests
from factoring_app.domain.entities import Disbursement
from factoring_app.infrastructure.db_config import DesembolsoSessionLocal

SUNAT_URL = "http://sunat_service:6000"
BANK_URL = "http://bank_service:6300"
NOTIF_KAFKA_URL = "http://notification_kafka_adapter:6500/notificar"


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
