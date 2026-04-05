"""fix usuarios created_at

Revision ID: 1995dfdfd32d
Revises: a1b2c3d4e5f6
Create Date: 2026-03-24 13:49:48.350473

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1995dfdfd32d'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def _usuarios_column_names(connection):
    insp = sa.inspect(connection)
    return {c["name"] for c in insp.get_columns("usuarios")}


def upgrade():
    conn = op.get_bind()
    cols = _usuarios_column_names(conn)
    if "created_at" not in cols:
        with op.batch_alter_table("usuarios", schema=None) as batch_op:
            batch_op.add_column(sa.Column("created_at", sa.DateTime(), nullable=True))


def downgrade():
    conn = op.get_bind()
    cols = _usuarios_column_names(conn)
    if "created_at" in cols:
        with op.batch_alter_table("usuarios", schema=None) as batch_op:
            batch_op.drop_column("created_at")
