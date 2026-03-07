"""
Modelos de base de datos. Usan db de extensions (sin importar app).
"""
from config import (
    EMAIL_MAX_LEN,
    PASSWORD_MAX_LEN,
    PASSWORD_MIN_LEN,
    USUARIO_MAX_LEN,
)
from extensions import db


class Usuario(db.Model):
    """Usuario para login: usuario, email (único), contraseña hasheada."""
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    usuario = db.Column(db.String(USUARIO_MAX_LEN), nullable=False)
    email = db.Column(db.String(EMAIL_MAX_LEN), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    def to_dict(self):
        return {"id": self.id, "usuario": self.usuario, "email": self.email}
