"""drop legacy meals, meal_foods, diet_plan_meals, food_items

Revision ID: f1e2d3c4b5a6
Revises: e7c2a1b3d4f6
Create Date: 2026-04-05

"""
from alembic import op
import sqlalchemy as sa


revision = "f1e2d3c4b5a6"
down_revision = "e7c2a1b3d4f6"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("diet_plan_meals")
    op.drop_table("meal_foods")
    with op.batch_alter_table("meals", schema=None) as batch_op:
        batch_op.drop_index("idx_meal_user_date")
    op.drop_table("meals")
    op.drop_table("food_items")


def downgrade():
    op.create_table(
        "food_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=10), nullable=True),
        sa.Column("calories", sa.Float(), nullable=False),
        sa.Column("protein", sa.Float(), nullable=True),
        sa.Column("fat", sa.Float(), nullable=True),
        sa.Column("carbs", sa.Float(), nullable=True),
        sa.Column("sugar", sa.Float(), nullable=True),
        sa.Column("fiber", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "meals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", "order"),
    )
    with op.batch_alter_table("meals", schema=None) as batch_op:
        batch_op.create_index("idx_meal_user_date", ["user_id", "date"], unique=False)
    op.create_table(
        "diet_plan_meals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("diet_plan_id", sa.Integer(), nullable=False),
        sa.Column("meal_id", sa.Integer(), nullable=False),
        sa.Column(
            "day",
            sa.Enum(
                "lunes",
                "martes",
                "miercoles",
                "jueves",
                "viernes",
                "sabado",
                "domingo",
                name="weekday",
            ),
            nullable=False,
        ),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["diet_plan_id"], ["diet_plans.id"]),
        sa.ForeignKeyConstraint(["meal_id"], ["meals.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "meal_foods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meal_id", sa.Integer(), nullable=False),
        sa.Column("food_item_id", sa.Integer(), nullable=False),
        sa.Column("meals_number", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["food_item_id"], ["food_items.id"]),
        sa.ForeignKeyConstraint(["meal_id"], ["meals.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
