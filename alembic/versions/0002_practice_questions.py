"""Add the practice-question bank."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_practice_questions"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    # learner_level already exists from 0001; reuse it without re-creating the type.
    level = postgresql.ENUM("beginner", "intermediate", name="learner_level", create_type=False)
    op.create_table(
        "practice_questions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("lesson_id", sa.Uuid(), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_id", sa.Uuid(), sa.ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False, server_default="mcq"),
        sa.Column("difficulty", level, nullable=False, server_default="beginner"),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("misconception", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_practice_questions_lesson", "practice_questions", ["lesson_id"])
    op.create_index("ix_practice_questions_chunk", "practice_questions", ["chunk_id"])


def downgrade():
    op.drop_index("ix_practice_questions_chunk", table_name="practice_questions")
    op.drop_index("ix_practice_questions_lesson", table_name="practice_questions")
    op.drop_table("practice_questions")
