from flask import Flask, jsonify, request

from factoring_app.application.desembolso_use_cases import (
    EjecutarDesembolsoMasivoUseCase,
    EjecutarDesembolsoUseCase,
)
from factoring_app.infrastructure.db_config import DesembolsoSessionLocal, init_desembolso_db


def create_app(initialize_database: bool = False) -> Flask:
    app = Flask(__name__)
    if initialize_database:
        init_desembolso_db()

    @app.post("/desembolso")
    def ejecutar_desembolso():
        data = request.get_json(silent=True) or {}
        use_case = EjecutarDesembolsoUseCase(db_session=DesembolsoSessionLocal())
        resultado = use_case.ejecutar(data)
        if "error" in resultado:
            return jsonify(resultado), 400
        return jsonify(resultado), 201

    @app.post("/desembolso/masivo")
    def ejecutar_desembolso_masivo():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "El BODY debe ser un objeto JSON."}), 400

        try:
            resultado = EjecutarDesembolsoMasivoUseCase().ejecutar(data)
        except Exception as error:
            app.logger.exception("Error al ejecutar el desembolso masivo")
            return jsonify({"error": str(error)}), 500
        return jsonify(resultado), 200

    return app


app = create_app()
