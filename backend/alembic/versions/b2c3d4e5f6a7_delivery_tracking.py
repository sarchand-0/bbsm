"""delivery_tracking

Revision ID: b2c3d4e5f6a7
Revises: 41bba4b4c85e
Create Date: 2026-04-23 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '41bba4b4c85e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Extend UserRole enum with 'rider' ────────────────────────────────────
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'rider'")

    # ── delivery_zones ───────────────────────────────────────────────────────
    op.create_table(
        'delivery_zones',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('bounds', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('estimated_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── riders ───────────────────────────────────────────────────────────────
    op.create_table(
        'riders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('vehicle_type', sa.String(length=50), nullable=False, server_default='motorcycle'),
        sa.Column('license_plate', sa.String(length=20), nullable=True),
        sa.Column('is_available', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('current_lat', sa.Float(), nullable=True),
        sa.Column('current_lng', sa.Float(), nullable=True),
        sa.Column('last_location_at', sa.DateTime(), nullable=True),
        sa.Column('rating', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('total_deliveries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index('ix_riders_user_id', 'riders', ['user_id'])
    op.create_index('ix_riders_is_available', 'riders', ['is_available'])

    # ── deliveries ───────────────────────────────────────────────────────────
    op.create_table(
        'deliveries',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('order_id', sa.Uuid(), nullable=False),
        sa.Column('rider_id', sa.Uuid(), nullable=True),
        sa.Column('zone_id', sa.Uuid(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('picked_up_at', sa.DateTime(), nullable=True),
        sa.Column('out_for_delivery_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('estimated_delivery_at', sa.DateTime(), nullable=True),
        sa.Column('delivery_otp', sa.String(length=6), nullable=True),
        sa.Column('otp_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('delivery_notes', sa.Text(), nullable=True),
        sa.Column('delivery_photo_url', sa.String(length=500), nullable=True),
        sa.Column('rider_lat', sa.Float(), nullable=True),
        sa.Column('rider_lng', sa.Float(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('rating_comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['rider_id'], ['riders.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['zone_id'], ['delivery_zones.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_id'),
    )
    op.create_index('ix_deliveries_order_id', 'deliveries', ['order_id'])
    op.create_index('ix_deliveries_rider_id', 'deliveries', ['rider_id'])

    # ── order_events ─────────────────────────────────────────────────────────
    op.create_table(
        'order_events',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('order_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lng', sa.Float(), nullable=True),
        sa.Column('created_by_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_order_events_order_id', 'order_events', ['order_id'])

    # ── notifications ────────────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_read', 'notifications', ['read'])


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('order_events')
    op.drop_table('deliveries')
    op.drop_table('riders')
    op.drop_table('delivery_zones')
