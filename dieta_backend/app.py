from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
CORS(app)

# Base de datos SQLite en dieta_backend/instance/app.db
BASE_DIR = Path(__file__).resolve().parent
instance_dir = BASE_DIR / "instance"
instance_dir.mkdir(exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + str(instance_dir / "app.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# Importar modelos para que existan las tablas; luego crearlas
import models  # noqa: E402

with app.app_context():
    db.create_all()

Autor = "Andrei"


@app.route("/")
def home():
    return "Backend DIETA_MVP funcionando."


@app.route("/api/autor")
def autor():
    return jsonify({"Autor": Autor})


@app.route("/api/usuarios")
def listar_usuarios():
    """Ejemplo: lista los usuarios en la BD (vacía al inicio)."""
    usuarios = models.Usuario.query.all()
    return jsonify([u.to_dict() for u in usuarios])


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=8080)
