FROM python:3.10-slim

WORKDIR /app

COPY security_adapter/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY security_adapter/ .

EXPOSE 6600

CMD ["python", "security_service.py"]
