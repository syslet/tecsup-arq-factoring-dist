from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/pricing/calcular", methods=["POST"])
def calcular_pricing():
    data = request.json
    total_amount = data["total_amount"]
    advance_amount = data["advance_amount"]

    # Simulación de cálculo externo
    advance_rate = advance_amount / total_amount
    monthly_rate = 0.02
    net_disbursement = advance_amount - (total_amount * monthly_rate)

    return jsonify({
        "advance_rate": round(advance_rate, 2),
        "monthly_rate": monthly_rate,
        "net_disbursement": net_disbursement,
        "source": "external_rest_service"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6110)
