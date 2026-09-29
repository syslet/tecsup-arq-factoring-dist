from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/banco/desembolso", methods=["POST"])
def ejecutar_desembolso():
    data = request.json
    monto = data.get("amount")
    cuenta = data.get("bank_account_number")

    # lógica simulada de transferencia bancaria
    return jsonify({
        "cuenta": cuenta,
        "monto": monto,
        "estado": "TRANSFERENCIA_EXITOSA"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6300)
