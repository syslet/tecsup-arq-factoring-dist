from flask import Flask, jsonify, request

from factoring_app.application.desembolso_use_cases import EjecutarDesembolsoUseCase
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

    return app


app = create_app()
