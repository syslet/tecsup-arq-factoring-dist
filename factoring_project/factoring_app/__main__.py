from factoring_app.interface.flask_app import app
from factoring_app.infrastructure.db_config import init_db

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)
