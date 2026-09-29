import pika, time, json, os, random
from datetime import datetime

# Variables de entorno
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "factoring_user")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "factoring_pass")
QUEUE_NAME = os.getenv("RABBITMQ_QUEUE", "pricing_queue")

def connect_with_retry(host=RABBITMQ_HOST, user=RABBITMQ_USER, password=RABBITMQ_PASS, retries=10, delay=5):
    credentials = pika.PlainCredentials(user, password)
    for attempt in range(retries):
        try:
            return pika.BlockingConnection(
                pika.ConnectionParameters(host=host, credentials=credentials)
            )
        except pika.exceptions.AMQPConnectionError:
            print(f"RabbitMQ no disponible, reintento {attempt+1}/{retries}...")
            time.sleep(delay)
    raise Exception("No se pudo conectar a RabbitMQ después de varios intentos")

def publish_pricing_event(event):
    connection = connect_with_retry()
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.basic_publish(
        exchange="",
        routing_key=QUEUE_NAME,
        body=json.dumps(event),
        properties=pika.BasicProperties(delivery_mode=2)  # persistente
    )
    print(f"Mensaje enviado a la cola '{QUEUE_NAME}': {event}")
    connection.close()

if __name__ == "__main__":
    while True:
        # Generar tasa aleatoria entre 0.02 y 0.15       
        advance_rate = round(random.uniform(0.02, 0.15), 4)
        monthly_rate = round(random.uniform(0.01, 0.05), 4)

        timestamp = datetime.utcnow().isoformat()

        event = {
            "type": "pricing_update",
            "advance_rate": advance_rate,
            "monthly_rate": monthly_rate,
            "timestamp": timestamp
        }

        publish_pricing_event(event)
        time.sleep(30)  # esperar 30 segundos