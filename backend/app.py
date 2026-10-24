import os
from flask import Flask, jsonify
from flask_cors import CORS
from database import engine, Base
from routes.api import api_bp
from seed_data import seed_database

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "vericore-sih-secret-key-2026")
    app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB max upload

    # Enable CORS for local Vite dev server
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "*"]}})

    # Create tables
    Base.metadata.create_all(bind=engine)

    # Register blueprints
    app.register_blueprint(api_bp)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found", "status_code": 404}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "status_code": 500}), 500

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "status_code": 400}), 400

    return app

if __name__ == "__main__":
    # Ensure database is seeded on startup
    seed_database()
    app = create_app()
    print("VeriCore Regulatory Compliance & Verification Platform API running on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
