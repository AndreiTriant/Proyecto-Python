"""meal_log_entries quantity and unit

Revision ID: i1j2k3l4m5n6
Revises: h0i1j2k3l4m5
Create Date: 2026-04-25

"""
from alembic import op
import sqlalchemy as sa


revision = "i1j2k3l4m5n6"
down_revision = "h0i1j2k3l4m5"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("meal_log_entries", schema=None) as batch_op:
        batch_op.add_column(sa.Column("quantity", sa.Float(), nullable=False, server_default="1"))
        batch_op.add_column(
            sa.Column("unit", sa.String(length=10), nullable=False, server_default="porción")
        )


def downgrade():
    with op.batch_alter_table("meal_log_entries", schema=None) as batch_op:
        batch_op.drop_column("unit")
        batch_op.drop_column("quantity")

