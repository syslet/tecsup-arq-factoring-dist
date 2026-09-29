import os, time, json
from kafka import KafkaProducer
from flask import Flask, request, jsonify

KAFKA_HOST = os.getenv("KAFKA_BROKER", "kafka:9092")
TOPIC_NAME = os.getenv("KAFKA_TOPIC", "notifications")

app = Flask(__name__)

def connect_producer():
    for attempt in range(10):
        try:
            return KafkaProducer(
                bootstrap_servers=[KAFKA_HOST],
                value_serializer=lambda v: json.dumps(v).encode("utf-8")
            )
        except Exception as e:
            print(f"Kafka no disponible, reintento {attempt+1}/10... Error: {e}")
            time.sleep(5)
    raise Exception("No se pudo conectar a Kafka después de varios intentos")

producer = connect_producer()

@app.route("/notificar", methods=["POST"])
def notificar():
    data = request.json
    event = {
        "type": data.get("type", "email"),
        "destinatario": data.get("destinatario"),
        "mensaje": data.get("mensaje"),
        "extra": data.get("extra", {})
    }
    producer.send(TOPIC_NAME, event)
    producer.flush()
    print(f"Evento publicado en Kafka -> {event}")
    return jsonify({"status": "ok", "event": event})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6500)
