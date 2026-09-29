FROM python:3.10-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pricing_external_adapter/ .

EXPOSE 6110
CMD ["python", "external_pricing_service.py"]
