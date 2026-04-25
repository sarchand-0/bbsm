import uuid
from datetime import datetime

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DeliveryZone(Base):
    __tablename__ = "delivery_zones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    bounds: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())


class Rider(Base):
    __tablename__ = "riders"
    __table_args__ = (UniqueConstraint("user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(50), default="motorcycle", nullable=False)
    license_plate: Mapped[str | None] = mapped_column(String(20))
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    current_lat: Mapped[float | None] = mapped_column(Float)
    current_lng: Mapped[float | None] = mapped_column(Float)
    last_location_at: Mapped[datetime | None]
    rating: Mapped[float | None] = mapped_column(Numeric(3, 2))
    total_deliveries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    verification_status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending", nullable=False)
    documents: Mapped[list] = mapped_column(JSONB, default=list, server_default="[]", nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())


class Delivery(Base):
    __tablename__ = "deliveries"
    __table_args__ = (UniqueConstraint("order_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True, nullable=False)
    rider_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("riders.id", ondelete="SET NULL"), index=True)
    zone_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("delivery_zones.id", ondelete="SET NULL"))
    assigned_at: Mapped[datetime | None]
    picked_up_at: Mapped[datetime | None]
    out_for_delivery_at: Mapped[datetime | None]
    delivered_at: Mapped[datetime | None]
    estimated_delivery_at: Mapped[datetime | None]
    delivery_otp: Mapped[str | None] = mapped_column(String(6))
    otp_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    delivery_notes: Mapped[str | None] = mapped_column(Text)
    delivery_photo_url: Mapped[str | None] = mapped_column(String(500))
    rider_lat: Mapped[float | None] = mapped_column(Float)
    rider_lng: Mapped[float | None] = mapped_column(Float)
    rating: Mapped[int | None] = mapped_column(Integer)
    rating_comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())


class OrderEvent(Base):
    __tablename__ = "order_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())
