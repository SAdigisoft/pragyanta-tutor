"""Store the exact source quote supporting each practice question."""

from alembic import op
import sqlalchemy as sa

revision = "0003_practice_source_quote"
down_revision = "0002_practice_questions"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("practice_questions", sa.Column("source_quote", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("practice_questions", "source_quote")
