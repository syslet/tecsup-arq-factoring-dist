from datetime import datetime

import requests
from flask import Flask, jsonify, request

from factoring_app.domain.entities import Company, CompanyDocument, User
from factoring_app.infrastructure.db_config import RegistroSessionLocal, init_registro_db


def create_app(initialize_database: bool = False) -> Flask:
    app = Flask(__name__)
    if initialize_database:
        init_registro_db()

    @app.post("/registro/usuario")
    def registrar_usuario():
        data = request.get_json(silent=True) or {}
        db = RegistroSessionLocal()
        try:
            usuario = User(**data)
            db.add(usuario)
            db.commit()
            db.refresh(usuario)
            return jsonify({"status": "Usuario registrado", "id": usuario.id}), 201
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @app.post("/registro/empresa")
    def registrar_empresa():
        data = request.get_json(silent=True) or {}
        response = requests.post(
            "http://sunat_service:6000/validar/empresa",
            json={"ruc": data["ruc"]},
            timeout=10,
        )
        if response.json().get("estado") != "VALID":
            return jsonify({"error": "Empresa no válida"}), 400

        db = RegistroSessionLocal()
        try:
            empresa = Company(**data)
            db.add(empresa)
            db.commit()
            db.refresh(empresa)
            return jsonify({"status": "Empresa registrada", "id": empresa.id}), 201
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @app.post("/registro/documento")
    def registrar_documento():
        data = request.get_json(silent=True) or {}
        db = RegistroSessionLocal()
        try:
            documento = CompanyDocument(
                company_id=data["company_id"],
                document_type=data["document_type"],
                file_name=data["file_name"],
                file_path=data["file_path"],
                uploaded_at=datetime.now(),
            )
            db.add(documento)
            db.commit()
            db.refresh(documento)
            return jsonify({"status": "Documento registrado", "id": documento.id}), 201
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    return app


app = create_app()
