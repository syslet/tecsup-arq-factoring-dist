# factoring/infrastructure/bank_services.py
from factoring_app.domain.ports import BancoPort

class BankRESTAdapter(BancoPort):
    def transferir_monto(self, cuenta: str, monto: float):
        print(f"[BANCO] Transferencia de {monto} a la cuenta {cuenta}")
        return True
