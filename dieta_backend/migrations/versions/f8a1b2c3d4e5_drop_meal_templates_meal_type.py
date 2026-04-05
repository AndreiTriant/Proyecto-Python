"""drop meal_templates.meal_type

Revision ID: f8a1b2c3d4e5
Revises: 1995dfdfd32d
Create Date: 2026-04-05

"""
from alembic import op
import sqlalchemy as sa


revision = "f8a1b2c3d4e5"
down_revision = "1995dfdfd32d"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("meal_templates", schema=None) as batch_op:
        batch_op.drop_column("meal_type")


def downgrade():
    with op.batch_alter_table("meal_templates", schema=None) as batch_op:
        batch_op.add_column(sa.Column("meal_type", sa.String(length=50), nullable=True))
