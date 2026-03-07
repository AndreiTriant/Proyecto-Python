"""
Script para crear las tablas en la base de datos.
Ejecutar cuando la tabla 'usuarios' (u otras) no exista.
Al importar app se registran los modelos (models).
"""
from app import app, db  # noqa: F401

with app.app_context():
    db.create_all()
    print("Tablas creadas correctamente en instance/app.db")
