from factoring_app.interface.venta_app import create_app


if __name__ == "__main__":
    app = create_app(initialize_database=True)
    app.run(host="0.0.0.0", port=5002)
