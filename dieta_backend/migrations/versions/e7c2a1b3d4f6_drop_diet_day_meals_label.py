"""drop diet_day_meals.label

Revision ID: e7c2a1b3d4f6
Revises: f8a1b2c3d4e5
Create Date: 2026-04-05

"""
from alembic import op
import sqlalchemy as sa


revision = "e7c2a1b3d4f6"
down_revision = "f8a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("diet_day_meals", schema=None) as batch_op:
        batch_op.drop_column("label")


def downgrade():
    with op.batch_alter_table("diet_day_meals", schema=None) as batch_op:
        batch_op.add_column(sa.Column("label", sa.String(length=50), nullable=True))
