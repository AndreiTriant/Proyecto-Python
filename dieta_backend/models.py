from app import db


class Usuario(db.Model):
    """Modelo de ejemplo. Puedes añadir más tablas aquí."""
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def to_dict(self):
        return {"id": self.id, "nombre": self.nombre, "email": self.email}
