from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/notificar/email", methods=["POST"])
def enviar_email():
    data = request.json
    destinatario = data.get("destinatario")
    mensaje = data.get("mensaje")

    # lógica simulada de envío de correo
    return jsonify({
        "destinatario": destinatario,
        "estado": "ENVIADO",
        "mensaje": mensaje
    })

@app.route("/notificar/sms", methods=["POST"])
def enviar_sms():
    data = request.json
    numero = data.get("numero")
    mensaje = data.get("mensaje")

    # lógica simulada de envío de SMS
    return jsonify({
        "numero": numero,
        "estado": "ENVIADO",
        "mensaje": mensaje
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6200)
