# Imagen base ligera con Python
FROM python:3.11-slim

# Directorio de trabajo
WORKDIR /app

# Copiar requirements y dependencias
COPY requirements.txt .

# Instalar dependencias necesarias para Kafka
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del adaptador
COPY notification_kafka_adapter/ .

# Exponer puerto del servicio
EXPOSE 6500

# Comando de inicio
CMD ["python", "notification_kafka_service.py"]
