"""Initial Pragyanta schema."""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    status = postgresql.ENUM("open", "resolved", "unresolved", name="misconception_status", create_type=False)
    level = postgresql.ENUM("beginner", "intermediate", name="learner_level", create_type=False)
    role = postgresql.ENUM("student", "tutor", name="message_role", create_type=False)
    msg_type = postgresql.ENUM("chat", "diagnostic_question", "remediation", "verification_question", "verdict", "off_topic", name="message_type", create_type=False)
    level.create(op.get_bind(), checkfirst=True)
    role.create(op.get_bind(), checkfirst=True)
    msg_type.create(op.get_bind(), checkfirst=True)
    status.create(op.get_bind(), checkfirst=True)
    op.create_table("lessons",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("chunks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("lesson_id", sa.Uuid(), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.UniqueConstraint("lesson_id", "chunk_index", name="uq_chunk_lesson_index"))
    op.create_table("sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("lesson_id", sa.Uuid(), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("learner_level", level, nullable=False, server_default="beginner"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", role, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("msg_type", msg_type, nullable=False, server_default="chat"),
        sa.Column("citations", sa.JSON(), nullable=True),
        sa.Column("verdict_status", status, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_table("misconceptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", sa.Uuid(), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("status", status, nullable=False, server_default="open"),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_chunks_lesson", "chunks", ["lesson_id"])
    op.create_index("ix_sessions_lesson", "sessions", ["lesson_id"])
    op.create_index("ix_messages_session_created", "messages", ["session_id", "created_at"])
    op.create_index("ix_misconceptions_session_status", "misconceptions", ["session_id", "status"])
    op.create_index("ix_misconceptions_lesson", "misconceptions", ["lesson_id"])


def downgrade():
    op.drop_table("misconceptions")
    op.drop_table("messages")
    op.drop_table("sessions")
    op.drop_table("chunks")
    op.drop_table("lessons")
    for name in ("message_type", "message_role", "learner_level", "misconception_status"):
        postgresql.ENUM(name=name).drop(op.get_bind(), checkfirst=True)
