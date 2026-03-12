"""
Extensiones compartidas (sin dependencia de app).
La instancia db se vincula al app en app.py con db.init_app(app).
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()
