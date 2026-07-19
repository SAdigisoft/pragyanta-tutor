"""Mark disposable reviewer and scenario sessions explicitly."""

from alembic import op
import sqlalchemy as sa


revision = "0005_demo_sessions"
down_revision = "0004_featured_practice_question"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "sessions",
        sa.Column("is_demo", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_index("ix_sessions_is_demo", "sessions", ["is_demo"])


def downgrade():
    op.drop_index("ix_sessions_is_demo", table_name="sessions")
    op.drop_column("sessions", "is_demo")
