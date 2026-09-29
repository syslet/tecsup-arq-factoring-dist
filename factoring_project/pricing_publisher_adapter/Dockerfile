FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pricing_publisher_adapter/ .

EXPOSE 6410
CMD ["python", "pricing_publisher_service.py"]
