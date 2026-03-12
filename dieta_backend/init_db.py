"""
Script auxiliar para aplicar migraciones en la base de datos usando Flask-Migrate.
Debe ejecutarse después de haber configurado las migraciones (flask db init/migrate/upgrade).
"""
from flask_migrate import upgrade

from app import app  # noqa: F401

if __name__ == "__main__":
    with app.app_context():
        upgrade()
        print("Migraciones aplicadas correctamente en instance/app.db")
