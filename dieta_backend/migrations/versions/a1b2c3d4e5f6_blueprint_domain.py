"""Blueprint domain: meal_templates, diet_days, checkins, weight

Revision ID: a1b2c3d4e5f6
Revises: dcbcaa4db73a
Create Date: 2026-03-12

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "dcbcaa4db73a"
branch_labels = None
depends_on = None


def upgrade():
    # diet_plans: add is_active
    with op.batch_alter_table("diet_plans", schema=None) as batch_op:
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=True))
    op.execute("UPDATE diet_plans SET is_active = 0 WHERE is_active IS NULL")
    with op.batch_alter_table("diet_plans", schema=None) as batch_op:
        batch_op.alter_column(
            "is_active", existing_type=sa.Boolean(), nullable=False
        )

    # meal_templates
    op.create_table(
        "meal_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("meal_type", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("calories", sa.Float(), nullable=True),
        sa.Column("protein", sa.Float(), nullable=True),
        sa.Column("fat", sa.Float(), nullable=True),
        sa.Column("carbs", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # meal_components
    op.create_table(
        "meal_components",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meal_template_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=10), nullable=True),
        sa.Column("calories", sa.Float(), nullable=True),
        sa.Column("protein", sa.Float(), nullable=True),
        sa.Column("fat", sa.Float(), nullable=True),
        sa.Column("carbs", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["meal_template_id"], ["meal_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # diet_days (reuse weekday enum from baseline)
    op.create_table(
        "diet_days",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("diet_plan_id", sa.Integer(), nullable=False),
        sa.Column(
            "weekday",
            sa.Enum(
                "lunes", "martes", "miercoles", "jueves",
                "viernes", "sabado", "domingo",
                name="weekday",
                create_constraint=False,
            ),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["diet_plan_id"], ["diet_plans.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("diet_plan_id", "weekday", name="uq_diet_plan_weekday"),
    )

    # diet_day_meals
    op.create_table(
        "diet_day_meals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("diet_day_id", sa.Integer(), nullable=False),
        sa.Column("meal_template_id", sa.Integer(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=True),
        sa.Column("label", sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(["diet_day_id"], ["diet_days.id"]),
        sa.ForeignKeyConstraint(["meal_template_id"], ["meal_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # checkin_status enum (SQLite: use string)
    op.create_table(
        "daily_checkins",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
        ),
        sa.Column("diet_plan_id", sa.Integer(), nullable=True),
        sa.Column(
            "weekday_used",
            sa.Enum(
                "lunes", "martes", "miercoles", "jueves",
                "viernes", "sabado", "domingo",
                name="weekday",
                create_constraint=False,
            ),
            nullable=True,
        ),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["diet_plan_id"], ["diet_plans.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", name="uq_user_date"),
    )

    op.create_table(
        "daily_checkin_meal_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("daily_checkin_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("calories_approx", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["daily_checkin_id"], ["daily_checkins.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "weight_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=False),
        sa.Column("note", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("weight_entries")
    op.drop_table("daily_checkin_meal_logs")
    op.drop_table("daily_checkins")
    op.drop_table("diet_day_meals")
    op.drop_table("diet_days")
    op.drop_table("meal_components")
    op.drop_table("meal_templates")

    with op.batch_alter_table("diet_plans", schema=None) as batch_op:
        batch_op.drop_column("is_active")
