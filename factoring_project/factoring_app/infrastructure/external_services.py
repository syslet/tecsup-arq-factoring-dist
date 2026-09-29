# factoring_app/infrastructure/external_services.py
from factoring_app.domain.ports import ValidacionExternaPort, PricingPort
from factoring_app.domain.entities import InvoiceSheet, Invoice

class SUNATSOAPAdapter(ValidacionExternaPort):
    def validar_factura(self, invoice: Invoice):
        # Simulación de validación SOAP con SUNAT
        return True

    def validar_empresa(self, ruc: str):
        # Simulación de validación de RUC
        return True


class PricingInternoAdapter(PricingPort):
    def calcular_tasa(self, sheet: InvoiceSheet):
        # Regla simple: tasa depende del número de facturas
        if len(sheet.invoices) <= 10:
            return 0.05
        else:
            return 0.07
