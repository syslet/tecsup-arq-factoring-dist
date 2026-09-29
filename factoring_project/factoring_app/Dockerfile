FROM python:3.10-slim
WORKDIR /app

# Copiar requirements desde la raíz
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar la carpeta factoring_app como paquete
COPY . .

# El compose selecciona el entrypoint del caso de uso.
EXPOSE 5001 5002 5003
