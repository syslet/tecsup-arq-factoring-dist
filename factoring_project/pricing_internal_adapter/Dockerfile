FROM python:3.10-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pricing_internal_adapter/ .

EXPOSE 6100
CMD ["python", "internal_pricing_service.py"]
