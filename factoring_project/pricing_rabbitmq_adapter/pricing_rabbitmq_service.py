import pika, os, json
from flask import Flask, jsonify

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "factoring_user")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "factoring_pass")
QUEUE_NAME = os.getenv("RABBITMQ_QUEUE", "pricing_queue")

def get_latest_pricing():
    """Recupera el último mensaje de la cola pricing_queue"""
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)
    )
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    method_frame, header_frame, body = channel.basic_get(queue=QUEUE_NAME, auto_ack=True)
    connection.close()

    if body:
        try:
            return json.loads(body)
        except Exception:
            return {"error": "Mensaje inválido en la cola"}
    else:
        return {"error": "No hay mensajes en la cola"}

# --- Mantener el contenedor vivo con Flask ---
app = Flask(__name__)

@app.route("/pricing/latest", methods=["GET"])
def latest_pricing():
    return jsonify(get_latest_pricing())

if __name__ == "__main__":
    print("pricing_rabbitmq_adapter iniciado con API Flask...")
    app.run(host="0.0.0.0", port=6400)
