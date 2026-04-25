"""rider_verification

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-24 20:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from alembic import op

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('riders', sa.Column('verification_status', sa.String(20), nullable=False, server_default='pending'))
    op.add_column('riders', sa.Column('documents', JSONB, nullable=False, server_default='[]'))
    op.add_column('riders', sa.Column('rejection_reason', sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column('riders', 'rejection_reason')
    op.drop_column('riders', 'documents')
    op.drop_column('riders', 'verification_status')
