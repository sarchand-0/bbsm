"""Admin delivery management — assign riders, manage riders, view live map."""
import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.notifications import create_notification
from app.core.security import hash_password
from app.models.delivery import Delivery, DeliveryZone, OrderEvent, Rider
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole, UserStatus

router = APIRouter(prefix="/admin", tags=["admin"])

_staff_or_admin = require_role(UserRole.staff, UserRole.admin)


# ── Schemas ───────────────────────────────────────────────────────────────────

class RiderOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    email: str
    phone: str | None
    vehicle_type: str
    license_plate: str | None
    is_available: bool
    is_active: bool
    current_lat: float | None
    current_lng: float | None
    last_location_at: datetime | None
    rating: float | None
    total_deliveries: int
    active_delivery_id: str | None = None
    verification_status: str = "pending"
    documents: list = []
    rejection_reason: str | None = None


class RiderVerifyIn(BaseModel):
    action: str  # "approve" | "reject"
    reason: str | None = None


class RiderCreateIn(BaseModel):
    full_name: str
    email: str
    phone: str | None = None
    password: str
    vehicle_type: str = "motorcycle"
    license_plate: str | None = None


class RiderUpdateIn(BaseModel):
    vehicle_type: str | None = None
    license_plate: str | None = None
    is_available: bool | None = None
    is_active: bool | None = None


class AssignRiderIn(BaseModel):
    rider_id: uuid.UUID
    estimated_minutes: int = 60


class DeliveryOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    rider_id: uuid.UUID | None
    rider_name: str | None
    customer_name: str
    delivery_address: str
    order_status: str
    assigned_at: datetime | None
    picked_up_at: datetime | None
    out_for_delivery_at: datetime | None
    delivered_at: datetime | None
    estimated_delivery_at: datetime | None
    rider_lat: float | None
    rider_lng: float | None
    rating: int | None


class MapRiderOut(BaseModel):
    rider_id: uuid.UUID
    name: str
    lat: float
    lng: float
    last_updated: datetime
    is_available: bool
    active_order_id: str | None


class DeliveryZoneIn(BaseModel):
    name: str
    bounds: dict = {}
    estimated_minutes: int = 60
    active: bool = True


class DeliveryZoneOut(BaseModel):
    id: uuid.UUID
    name: str
    bounds: dict
    estimated_minutes: int
    active: bool
    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _rider_to_out(rider: Rider, db: AsyncSession) -> RiderOut:
    user = await db.scalar(select(User).where(User.id == rider.user_id))
    active_d = await db.scalar(
        select(Delivery.id).where(
            Delivery.rider_id == rider.id, Delivery.delivered_at.is_(None)
        )
    )
    return RiderOut(
        id=rider.id,
        user_id=rider.user_id,
        name=user.full_name if user else "",
        email=user.email if user else "",
        phone=user.phone if user else None,
        vehicle_type=rider.vehicle_type,
        license_plate=rider.license_plate,
        is_available=rider.is_available,
        is_active=rider.is_active,
        current_lat=rider.current_lat,
        current_lng=rider.current_lng,
        last_location_at=rider.last_location_at,
        rating=float(rider.rating) if rider.rating else None,
        total_deliveries=rider.total_deliveries,
        active_delivery_id=str(active_d) if active_d else None,
        verification_status=rider.verification_status,
        documents=rider.documents or [],
        rejection_reason=rider.rejection_reason,
    )


# ── Rider endpoints ───────────────────────────────────────────────────────────

@router.get("/riders", response_model=list[RiderOut])
async def list_riders(
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    riders = (await db.execute(select(Rider).order_by(Rider.created_at.desc()))).scalars().all()
    return [await _rider_to_out(r, db) for r in riders]


@router.post("/riders", response_model=RiderOut, status_code=201)
async def create_rider(
    body: RiderCreateIn,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(400, "Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        role=UserRole.rider,
        status=UserStatus.active,
    )
    db.add(user)
    await db.flush()

    rider = Rider(
        user_id=user.id,
        vehicle_type=body.vehicle_type,
        license_plate=body.license_plate,
    )
    db.add(rider)
    await db.commit()
    await db.refresh(rider)
    return await _rider_to_out(rider, db)


@router.patch("/riders/{rider_id}", response_model=RiderOut)
async def update_rider(
    rider_id: uuid.UUID,
    body: RiderUpdateIn,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    rider = await db.scalar(select(Rider).where(Rider.id == rider_id))
    if not rider:
        raise HTTPException(404, "Rider not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(rider, field, val)
    await db.commit()
    await db.refresh(rider)
    return await _rider_to_out(rider, db)


@router.delete("/riders/{rider_id}", status_code=204)
async def deactivate_rider(
    rider_id: uuid.UUID,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    rider = await db.scalar(select(Rider).where(Rider.id == rider_id))
    if rider:
        rider.is_active = False
        await db.commit()


@router.get("/riders/{rider_id}", response_model=RiderOut)
async def get_rider(
    rider_id: uuid.UUID,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    rider = await db.scalar(select(Rider).where(Rider.id == rider_id))
    if not rider:
        raise HTTPException(404, "Rider not found")
    return await _rider_to_out(rider, db)


@router.patch("/riders/{rider_id}/verify", response_model=RiderOut)
async def verify_rider(
    rider_id: uuid.UUID,
    body: RiderVerifyIn,
    current_user: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    if body.action not in ("approve", "reject"):
        raise HTTPException(400, "action must be 'approve' or 'reject'")
    rider = await db.scalar(select(Rider).where(Rider.id == rider_id))
    if not rider:
        raise HTTPException(404, "Rider not found")
    rider.verification_status = "approved" if body.action == "approve" else "rejected"
    rider.rejection_reason = body.reason if body.action == "reject" else None
    if body.action == "approve":
        rider.is_active = True
    await db.flush()
    # Notify the rider user
    notif_title = "Verification Approved!" if body.action == "approve" else "Verification Rejected"
    notif_body = (
        "Your documents have been verified. You can now start accepting deliveries."
        if body.action == "approve"
        else f"Your verification was rejected. Reason: {body.reason or 'No reason provided'}. Please re-upload your documents."
    )
    await create_notification(db, user_id=rider.user_id, type=f"rider_{body.action}d",
                              title=notif_title, body=notif_body, data={"rider_id": str(rider.id)})
    await db.commit()
    return await _rider_to_out(rider, db)


@router.get("/riders/{rider_id}/deliveries")
async def rider_delivery_history(
    rider_id: uuid.UUID,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    deliveries = (await db.execute(
        select(Delivery)
        .where(Delivery.rider_id == rider_id)
        .order_by(Delivery.created_at.desc())
        .limit(50)
    )).scalars().all()

    result = []
    for d in deliveries:
        order = await db.scalar(select(Order).where(Order.id == d.order_id))
        if not order:
            continue
        customer = await db.scalar(select(User).where(User.id == order.user_id)) if order else None
        from app.models.address import Address
        addr = await db.scalar(select(Address).where(Address.id == order.address_id)) if order and order.address_id else None
        result.append({
            "id": str(d.id),
            "order_id": str(d.order_id),
            "customer_name": customer.full_name if customer else "",
            "delivery_address": f"{addr.full_address}, {addr.city}" if addr else "",
            "order_status": order.status.value if order else "",
            "rating": d.rating,
            "completed_at": d.delivered_at.isoformat() if d.delivered_at else None,
            "distance_km": None,
        })
    return result


# ── Delivery assignment endpoints ─────────────────────────────────────────────

@router.get("/deliveries", response_model=list[DeliveryOut])
async def list_deliveries(
    active_only: bool = True,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(Delivery)
    if active_only:
        q = q.where(Delivery.delivered_at.is_(None))
    deliveries = (await db.execute(q.order_by(Delivery.created_at.desc()))).scalars().all()

    result = []
    for d in deliveries:
        order = await db.scalar(select(Order).where(Order.id == d.order_id))
        if not order:
            continue
        customer = await db.scalar(select(User).where(User.id == order.user_id))
        from app.models.address import Address
        addr = await db.scalar(select(Address).where(Address.id == order.address_id)) if order.address_id else None
        rider_name = None
        if d.rider_id:
            rider = await db.scalar(select(Rider).where(Rider.id == d.rider_id))
            if rider:
                rider_user = await db.scalar(select(User).where(User.id == rider.user_id))
                rider_name = rider_user.full_name if rider_user else None
        result.append(DeliveryOut(
            id=d.id,
            order_id=d.order_id,
            rider_id=d.rider_id,
            rider_name=rider_name,
            customer_name=customer.full_name if customer else "",
            delivery_address=f"{addr.full_address}, {addr.city}" if addr else "",
            order_status=order.status.value,
            assigned_at=d.assigned_at,
            picked_up_at=d.picked_up_at,
            out_for_delivery_at=d.out_for_delivery_at,
            delivered_at=d.delivered_at,
            estimated_delivery_at=d.estimated_delivery_at,
            rider_lat=d.rider_lat,
            rider_lng=d.rider_lng,
            rating=d.rating,
        ))
    return result


@router.post("/orders/{order_id}/assign")
async def assign_rider(
    order_id: uuid.UUID,
    body: AssignRiderIn,
    current_user: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    order = await db.scalar(select(Order).where(Order.id == order_id))
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status not in (OrderStatus.pending, OrderStatus.confirmed, OrderStatus.packed):
        raise HTTPException(400, f"Cannot assign rider to order in status '{order.status}'")

    rider = await db.scalar(select(Rider).where(Rider.id == body.rider_id, Rider.is_active.is_(True)))
    if not rider:
        raise HTTPException(404, "Rider not found or inactive")

    delivery = await db.scalar(select(Delivery).where(Delivery.order_id == order_id))
    if not delivery:
        delivery = Delivery(order_id=order_id)
        db.add(delivery)
        await db.flush()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    delivery.rider_id = rider.id
    delivery.assigned_at = now
    delivery.estimated_delivery_at = now + timedelta(minutes=body.estimated_minutes)

    if order.status == OrderStatus.pending:
        order.status = OrderStatus.confirmed
        order.status_updated_at = now

    db.add(OrderEvent(
        order_id=order.id,
        status="assigned",
        note=f"Rider assigned",
        created_by_id=current_user.id,
    ))

    await db.commit()

    try:
        await create_notification(
            db,
            user_id=order.user_id,
            type="rider_assigned",
            title="Rider On The Way!",
            body=f"A rider has been assigned to your order. Estimated delivery in {body.estimated_minutes} minutes.",
            data={"order_id": str(order.id)},
        )
        await db.commit()
    except Exception:
        await db.rollback()

    return {"ok": True, "estimated_delivery_at": delivery.estimated_delivery_at}


@router.delete("/orders/{order_id}/assign", status_code=204)
async def unassign_rider(
    order_id: uuid.UUID,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    delivery = await db.scalar(select(Delivery).where(Delivery.order_id == order_id))
    if delivery:
        delivery.rider_id = None
        delivery.assigned_at = None
        delivery.estimated_delivery_at = None
        await db.commit()


# ── Delivery map endpoint ─────────────────────────────────────────────────────

@router.get("/delivery-map", response_model=list[MapRiderOut])
async def delivery_map(
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    riders = (await db.execute(
        select(Rider).where(
            Rider.is_active.is_(True),
            Rider.current_lat.isnot(None),
        )
    )).scalars().all()

    result = []
    for rider in riders:
        user = await db.scalar(select(User).where(User.id == rider.user_id))
        active_d = await db.scalar(
            select(Delivery.order_id).where(
                Delivery.rider_id == rider.id, Delivery.delivered_at.is_(None)
            )
        )
        if rider.current_lat and rider.current_lng:
            result.append(MapRiderOut(
                rider_id=rider.id,
                name=user.full_name if user else "Rider",
                lat=rider.current_lat,
                lng=rider.current_lng,
                last_updated=rider.last_location_at or datetime.now(timezone.utc).replace(tzinfo=None),
                is_available=rider.is_available,
                active_order_id=str(active_d) if active_d else None,
            ))
    return result


# ── Delivery zones ────────────────────────────────────────────────────────────

@router.get("/delivery-zones", response_model=list[DeliveryZoneOut])
async def list_zones(
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return (await db.execute(select(DeliveryZone).order_by(DeliveryZone.name))).scalars().all()


@router.post("/delivery-zones", response_model=DeliveryZoneOut, status_code=201)
async def create_zone(
    body: DeliveryZoneIn,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    zone = DeliveryZone(**body.model_dump())
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return zone


@router.patch("/delivery-zones/{zone_id}", response_model=DeliveryZoneOut)
async def update_zone(
    zone_id: uuid.UUID,
    body: DeliveryZoneIn,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    zone = await db.scalar(select(DeliveryZone).where(DeliveryZone.id == zone_id))
    if not zone:
        raise HTTPException(404)
    for k, v in body.model_dump().items():
        setattr(zone, k, v)
    await db.commit()
    await db.refresh(zone)
    return zone


@router.delete("/delivery-zones/{zone_id}", status_code=204)
async def delete_zone(
    zone_id: uuid.UUID,
    _: User = Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    zone = await db.scalar(select(DeliveryZone).where(DeliveryZone.id == zone_id))
    if zone:
        await db.delete(zone)
        await db.commit()
