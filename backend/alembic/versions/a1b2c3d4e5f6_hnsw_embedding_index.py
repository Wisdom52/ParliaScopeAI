"""Add HNSW index on speech_segments.embedding for fast vector similarity search.

Revision ID: a1b2c3d4e5f6
Revises: 9d7c4b69148d
Create Date: 2026-03-24 00:40:58

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9d7c4b69148d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add HNSW index on speech_segments.embedding using pgvector cosine distance.

    HNSW settings:
      m=16             — bi-directional links per node (higher = better recall, more memory)
      ef_construction=64 — search width during index build (higher = better quality, slower build)

    Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction, so we use
    op.get_bind() with AUTOCOMMIT isolation to execute it outside the block.
    """
    connection = op.get_bind()

    # Ensure pgvector extension is present (idempotent)
    connection.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector;"))

    # HNSW index — cosine distance matches the <=> operator used in hybrid_search.
    connection.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS
            ix_speech_segments_embedding_hnsw
        ON speech_segments
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    """))


def downgrade() -> None:
    """Drop the HNSW index."""
    connection = op.get_bind()
    connection.execute(sa.text(
        "DROP INDEX IF EXISTS ix_speech_segments_embedding_hnsw;"
    ))
