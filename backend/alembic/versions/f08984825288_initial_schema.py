"""Initial schema

Revision ID: f08984825288
Revises: 
Create Date: 2026-02-03 17:06:21.468126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = 'f08984825288'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Counties
    op.create_table(
        'counties',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_counties_id'), 'counties', ['id'], unique=False)
    op.create_index(op.f('ix_counties_name'), 'counties', ['name'], unique=True)

    # 3. Constituencies
    op.create_table(
        'constituencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('county_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['county_id'], ['counties.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_constituencies_id'), 'constituencies', ['id'], unique=False)
    op.create_index(op.f('ix_constituencies_name'), 'constituencies', ['name'], unique=False)

    # 4. Wards
    op.create_table(
        'wards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('constituency_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['constituency_id'], ['constituencies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wards_id'), 'wards', ['id'], unique=False)
    op.create_index(op.f('ix_wards_name'), 'wards', ['name'], unique=False)

    # 5. Speech Segments
    op.create_table(
        'speech_segments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('hansard_id', sa.Integer(), nullable=True),
        sa.Column('speaker_name', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=768), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_speech_segments_hansard_id'), 'speech_segments', ['hansard_id'], unique=False)
    op.create_index(op.f('ix_speech_segments_id'), 'speech_segments', ['id'], unique=False)
    op.create_index(op.f('ix_speech_segments_speaker_name'), 'speech_segments', ['speaker_name'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_speech_segments_speaker_name'), table_name='speech_segments')
    op.drop_index(op.f('ix_speech_segments_id'), table_name='speech_segments')
    op.drop_index(op.f('ix_speech_segments_hansard_id'), table_name='speech_segments')
    op.drop_table('speech_segments')
    op.drop_index(op.f('ix_wards_name'), table_name='wards')
    op.drop_index(op.f('ix_wards_id'), table_name='wards')
    op.drop_table('wards')
    op.drop_index(op.f('ix_constituencies_name'), table_name='constituencies')
    op.drop_index(op.f('ix_constituencies_id'), table_name='constituencies')
    op.drop_table('constituencies')
    op.drop_index(op.f('ix_counties_name'), table_name='counties')
    op.drop_index(op.f('ix_counties_id'), table_name='counties')
    op.drop_table('counties')
