"""
Script para insertar datos de ejemplo en la base de datos.
Se puede ejecutar varias veces sin duplicar entradas clave.

Contraseñas: el login usa check_password_hash (Werkzeug). Aquí hay que guardar siempre
generate_password_hash(..., method="pbkdf2:sha256"), nunca texto plano en password_hash.
ensure_demo_password corrige usuarios demo creados con un seed antiguo incorrecto.
"""
from werkzeug.security import check_password_hash, generate_password_hash

from app import app, db
from models import Usuario


def get_or_create_user(usuario: str, email: str, password: str = "demo") -> Usuario:
    user = db.session.execute(
        db.select(Usuario).where(Usuario.email == email)
    ).scalar_one_or_none()
    if user:
        return user
    # Mismo algoritmo que routes/auth registro/login (obligatorio para que "demo" funcione al iniciar sesión).
    password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    user = Usuario(usuario=usuario, email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()
    return user


def ensure_demo_password(email: str, password: str) -> None:
    """
    Si el usuario demo ya existía con password_hash inválido (p. ej. texto plano),
    actualiza el hash para que coincida con /api/login (check_password_hash).
    """
    user = db.session.execute(db.select(Usuario).where(Usuario.email == email)).scalar_one_or_none()
    if not user:
        return
    try:
        if check_password_hash(user.password_hash, password):
            return
    except (ValueError, TypeError):
        pass
    user.password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    db.session.commit()


def seed():
    with app.app_context():
        get_or_create_user("demo", "demo@example.com", password="demo")
        ensure_demo_password("demo@example.com", "demo")
        print("Datos de ejemplo insertados (o ya existentes) correctamente.")


if __name__ == "__main__":
    seed()
