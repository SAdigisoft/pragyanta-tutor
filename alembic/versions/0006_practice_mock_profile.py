"""Store optional deterministic tutor behavior with a featured question."""

from alembic import op
import sqlalchemy as sa


revision = "0006_practice_mock_profile"
down_revision = "0005_demo_sessions"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("practice_questions", sa.Column("mock_profile", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("practice_questions", "mock_profile")
