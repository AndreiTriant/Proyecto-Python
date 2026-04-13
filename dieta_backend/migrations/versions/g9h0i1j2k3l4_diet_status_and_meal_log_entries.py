"""diet_day_status_entries + meal_log_entries

Revision ID: g9h0i1j2k3l4
Revises: e7c2a1b3d4f6
Create Date: 2026-04-13

"""
from alembic import op
import sqlalchemy as sa


revision = "g9h0i1j2k3l4"
down_revision = "f1e2d3c4b5a6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "meal_log_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("calories", sa.Float(), nullable=False, server_default="0"),
        sa.Column("protein", sa.Float(), nullable=False, server_default="0"),
        sa.Column("fat", sa.Float(), nullable=False, server_default="0"),
        sa.Column("carbs", sa.Float(), nullable=False, server_default="0"),
        sa.Column("meal_template_id", sa.Integer(), nullable=True),
        sa.Column("meal_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["meal_template_id"], ["meal_templates.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_meal_log_entries_user_date",
        "meal_log_entries",
        ["user_id", "date"],
        unique=False,
    )

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            INSERT INTO meal_log_entries (
                user_id, date, name, calories, protein, fat, carbs,
                meal_template_id, meal_order, notes, created_at
            )
            SELECT
                dc.user_id,
                dc.date,
                m.name,
                COALESCE(m.calories_approx, 0),
                0,
                0,
                0,
                NULL,
                0,
                '',
                datetime('now')
            FROM daily_checkin_meal_logs AS m
            JOIN daily_checkins AS dc ON m.daily_checkin_id = dc.id
            """
        )
    )

    op.drop_table("daily_checkin_meal_logs")
    op.rename_table("daily_checkins", "diet_day_status_entries")


def downgrade():
    op.rename_table("diet_day_status_entries", "daily_checkins")
    op.create_table(
        "daily_checkin_meal_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("daily_checkin_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("calories_approx", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(
            ["daily_checkin_id"],
            ["daily_checkins.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            INSERT INTO daily_checkin_meal_logs (daily_checkin_id, name, calories_approx)
            SELECT dc.id, m.name, NULLIF(m.calories, 0)
            FROM meal_log_entries AS m
            JOIN daily_checkins AS dc
              ON dc.user_id = m.user_id AND dc.date = m.date
            """
        )
    )

    op.drop_index("ix_meal_log_entries_user_date", table_name="meal_log_entries")
    op.drop_table("meal_log_entries")
