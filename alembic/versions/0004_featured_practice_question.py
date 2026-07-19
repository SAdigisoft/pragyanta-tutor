"""Mark one seeded practice question as each lesson's optional guided prompt."""

from alembic import op
import sqlalchemy as sa

revision = "0004_featured_practice_question"
down_revision = "0003_practice_source_quote"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "practice_questions",
        sa.Column("is_featured", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_index(
        "uq_practice_featured_lesson",
        "practice_questions",
        ["lesson_id"],
        unique=True,
        postgresql_where=sa.text("is_featured"),
    )


def downgrade():
    op.drop_index("uq_practice_featured_lesson", table_name="practice_questions")
    op.drop_column("practice_questions", "is_featured")
