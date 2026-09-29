from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/validar/factura", methods=["POST"])
def validar_factura():
    data = request.json
    # lógica simulada de validación
    return jsonify({"factura": data["invoice_number"], "estado": "VALID"})

@app.route("/validar/empresa", methods=["POST"])
def validar_empresa():
    data = request.json
    return jsonify({"ruc": data["ruc"], "estado": "VALID"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6000)
