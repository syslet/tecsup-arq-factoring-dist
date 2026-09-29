# factoring_app/infrastructure/notifications.py
from factoring_app.domain.ports import NotificacionPort

class EmailNotificationAdapter(NotificacionPort):
    def enviar_notificacion(self, destinatario: str, mensaje: str):
        print(f"[EMAIL] Enviando a {destinatario}: {mensaje}")


class SMSNotificationAdapter(NotificacionPort):
    def enviar_notificacion(self, destinatario: str, mensaje: str):
        print(f"[SMS] Enviando a {destinatario}: {mensaje}")
