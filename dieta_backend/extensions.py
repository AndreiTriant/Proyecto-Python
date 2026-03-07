"""
Extensiones compartidas (sin dependencia de app).
La instancia db se vincula al app en app.py con db.init_app(app).
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
