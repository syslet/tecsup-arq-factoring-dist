FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Ahora sí existe la carpeta pricing_rabbitmq_adapter en el contexto raíz
COPY pricing_rabbitmq_adapter/ .

EXPOSE 6400

CMD ["python", "pricing_rabbitmq_service.py"]
