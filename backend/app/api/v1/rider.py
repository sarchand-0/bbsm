"""Rider portal endpoints — role=rider only."""
import random
import string
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.config import settings
from app.core.database import get_db
from app.core.storage import save_upload
from app.core.notifications import create_notification
from app.models.delivery import Delivery, OrderEvent, Rider
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User, UserRole

router = APIRouter(prefix="/rider", tags=["rider"])


def _require_rider(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.rider, UserRole.staff, UserRole.admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Rider access required")
    return current_user


async def _get_rider(db: AsyncSession, user_id: uuid.UUID) -> Rider:
    result = await db.execute(select(Rider).where(Rider.user_id == user_id))
    rider = result.scalar_one_or_none()
    if not rider:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Rider profile not found")
    return rider


# ── Schemas ───────────────────────────────────────────────────────────────────

class RiderOrderItemOut(BaseModel):
    id: uuid.UUID
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    model_config = {"from_attributes": True}


class RiderOrderOut(BaseModel):
    id: uuid.UUID
    status: str
    customer_name: str
    delivery_address: str
    delivery_city: str
    total: float
    otp: str | None
    assigned_at: datetime | None
    picked_up_at: datetime | None
    out_for_delivery_at: datetime | None
    delivered_at: datetime | None
    estimated_delivery_at: datetime | None
    items: list[RiderOrderItemOut] = []
    model_config = {"from_attributes": True}


class LocationIn(BaseModel):
    lat: float
    lng: float


class StatusUpdateIn(BaseModel):
    action: str  # picked_up | out_for_delivery | delivered
    otp: str | None = None
    note: str | None = None


class AvailabilityIn(BaseModel):
    is_available: bool


class RiderStatsOut(BaseModel):
    today_delivered: int
    total_deliveries: int
    active_order_id: str | None
    is_available: bool
    rating: float | None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _build_order_out(order: Order, delivery: Delivery, db: AsyncSession) -> RiderOrderOut:
    from app.models.address import Address
    from app.models.user import User as UserModel

    # customer name
    user_res = await db.execute(select(UserModel).where(UserModel.id == order.user_id))
    customer = user_res.scalar_one_or_none()

    # address
    addr_res = await db.execute(select(Address).where(Address.id == order.address_id))
    addr = addr_res.scalar_one_or_none()

    # items
    items_res = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
    items = items_res.scalars().all()

    return RiderOrderOut(
        id=order.id,
        status=order.status.value,
        customer_name=customer.full_name if customer else "Customer",
        delivery_address=addr.full_address if addr else "",
        delivery_city=addr.city if addr else "",
        total=float(order.total),
        otp=delivery.delivery_otp,
        assigned_at=delivery.assigned_at,
        picked_up_at=delivery.picked_up_at,
        out_for_delivery_at=delivery.out_for_delivery_at,
        delivered_at=delivery.delivered_at,
        estimated_delivery_at=delivery.estimated_delivery_at,
        items=[RiderOrderItemOut(
            id=i.id, product_name=i.product_name, quantity=i.quantity,
            unit_price=float(i.unit_price), subtotal=float(i.subtotal)
        ) for i in items],
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/orders", response_model=list[RiderOrderOut])
async def rider_orders(
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)
    deliveries_res = await db.execute(
        select(Delivery).where(
            Delivery.rider_id == rider.id,
            Delivery.delivered_at.is_(None),
        ).order_by(Delivery.assigned_at.desc())
    )
    deliveries = deliveries_res.scalars().all()

    result = []
    for d in deliveries:
        order_res = await db.execute(select(Order).where(Order.id == d.order_id))
        order = order_res.scalar_one_or_none()
        if order:
            result.append(await _build_order_out(order, d, db))
    return result


@router.get("/orders/{order_id}", response_model=RiderOrderOut)
async def rider_order_detail(
    order_id: uuid.UUID,
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)
    d_res = await db.execute(
        select(Delivery).where(Delivery.order_id == order_id, Delivery.rider_id == rider.id)
    )
    delivery = d_res.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found in your queue")
    order_res = await db.execute(select(Order).where(Order.id == order_id))
    order = order_res.scalar_one()
    return await _build_order_out(order, delivery, db)


@router.patch("/orders/{order_id}/status")
async def update_delivery_status(
    order_id: uuid.UUID,
    body: StatusUpdateIn,
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)
    d_res = await db.execute(
        select(Delivery).where(Delivery.order_id == order_id, Delivery.rider_id == rider.id)
    )
    delivery = d_res.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    order_res = await db.execute(select(Order).where(Order.id == order_id))
    order = order_res.scalar_one()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if body.action == "picked_up":
        delivery.picked_up_at = now
        order.status = OrderStatus.shipped
        event_status = "shipped"
    elif body.action == "out_for_delivery":
        delivery.out_for_delivery_at = now
        event_status = "out_for_delivery"
        order.status = OrderStatus.shipped
    elif body.action == "delivered":
        if delivery.delivery_otp and not delivery.otp_verified:
            if body.otp != delivery.delivery_otp:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Incorrect OTP")
            delivery.otp_verified = True
        delivery.delivered_at = now
        order.status = OrderStatus.delivered
        order.status_updated_at = now
        rider.total_deliveries += 1
        event_status = "delivered"
        await create_notification(
            db,
            user_id=order.user_id,
            type="order_delivered",
            title="Order Delivered!",
            body=f"Your order #{str(order.id)[-8:].upper()} has been delivered. Enjoy!",
            data={"order_id": str(order.id)},
        )
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Unknown action: {body.action}")

    order.status_updated_at = now
    event = OrderEvent(
        order_id=order.id,
        status=event_status,
        note=body.note,
        lat=rider.current_lat,
        lng=rider.current_lng,
        created_by_id=current_user.id,
    )
    db.add(event)
    await db.commit()
    return {"ok": True, "status": event_status}


@router.post("/location")
async def update_location(
    body: LocationIn,
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)
    rider.current_lat = body.lat
    rider.current_lng = body.lng
    rider.last_location_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # Also push to active delivery
    d_res = await db.execute(
        select(Delivery).where(
            Delivery.rider_id == rider.id,
            Delivery.delivered_at.is_(None),
        )
    )
    active = d_res.scalar_one_or_none()
    if active:
        active.rider_lat = body.lat
        active.rider_lng = body.lng

    await db.commit()
    return {"ok": True}


@router.patch("/availability")
async def set_availability(
    body: AvailabilityIn,
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)
    rider.is_available = body.is_available
    await db.commit()
    return {"is_available": rider.is_available}


@router.get("/stats", response_model=RiderStatsOut)
async def rider_stats(
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)

    # Today's deliveries
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    today_count_res = await db.execute(
        select(sqlfunc.count(Delivery.id)).where(
            Delivery.rider_id == rider.id,
            Delivery.delivered_at >= today_start,
        )
    )
    today_delivered = today_count_res.scalar_one() or 0

    # Active order
    active_res = await db.execute(
        select(Delivery.order_id).where(
            Delivery.rider_id == rider.id,
            Delivery.delivered_at.is_(None),
        ).limit(1)
    )
    active_oid = active_res.scalar_one_or_none()

    return RiderStatsOut(
        today_delivered=today_delivered,
        total_deliveries=rider.total_deliveries,
        active_order_id=str(active_oid) if active_oid else None,
        is_available=rider.is_available,
        rating=float(rider.rating) if rider.rating else None,
    )


@router.get("/history")
async def rider_history(
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    deliveries = (await db.execute(
        select(Delivery)
        .where(Delivery.rider_id == rider.id, Delivery.delivered_at.isnot(None))
        .order_by(Delivery.delivered_at.desc())
        .limit(100)
    )).scalars().all()

    result = []
    today_earn = week_earn = total_earn = 0.0

    for d in deliveries:
        from app.models.address import Address
        order = await db.scalar(select(Order).where(Order.id == d.order_id))
        if not order:
            continue
        customer = await db.scalar(select(User).where(User.id == order.user_id))
        addr = await db.scalar(select(Address).where(Address.id == order.address_id)) if order.address_id else None

        amount = float(order.total)
        total_earn += amount
        if d.delivered_at >= today_start:
            today_earn += amount
        if d.delivered_at >= week_start:
            week_earn += amount

        result.append({
            "delivery_id": str(d.id),
            "order_id": str(d.order_id),
            "customer_name": customer.full_name if customer else "Customer",
            "delivery_address": f"{addr.full_address}, {addr.city}" if addr else "",
            "total": amount,
            "rating": d.rating,
            "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None,
        })

    return {
        "deliveries": result,
        "earnings": {
            "today": round(today_earn, 2),
            "this_week": round(week_earn, 2),
            "all_time": round(total_earn, 2),
        },
    }


# ── Settings / Verification ───────────────────────────────────────────────────

ALLOWED_DOC_TYPES = {"license", "national_id", "selfie", "other"}


@router.get("/settings/profile")
async def get_rider_profile(
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)
    return {
        "id": str(rider.id),
        "user_id": str(rider.user_id),
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "vehicle_type": rider.vehicle_type,
        "license_plate": rider.license_plate,
        "verification_status": rider.verification_status,
        "rejection_reason": rider.rejection_reason,
        "documents": rider.documents or [],
        "is_available": rider.is_available,
        "is_active": rider.is_active,
        "total_deliveries": rider.total_deliveries,
        "rating": float(rider.rating) if rider.rating else None,
    }


class VehicleUpdateIn(BaseModel):
    vehicle_type: str | None = None
    license_plate: str | None = None


@router.patch("/settings/profile")
async def update_rider_profile(
    body: VehicleUpdateIn,
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(db, current_user.id)
    if body.vehicle_type is not None:
        rider.vehicle_type = body.vehicle_type
    if body.license_plate is not None:
        rider.license_plate = body.license_plate
    await db.commit()
    return {"ok": True}


@router.post("/settings/documents")
async def upload_rider_document(
    doc_type: str,
    file: UploadFile = File(...),
    current_user: User = Depends(_require_rider),
    db: AsyncSession = Depends(get_db),
):
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            detail=f"doc_type must be one of: {', '.join(ALLOWED_DOC_TYPES)}")

    allowed_mime = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if file.content_type not in allowed_mime:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail="File must be jpeg, png, webp, or pdf")

    rider = await _get_rider(db, current_user.id)

    ext = (file.filename or "doc.jpg").rsplit(".", 1)[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "pdf"}:
        ext = "jpg"
    key = f"rider-docs/{uuid.uuid4()}.{ext}"
    url = await save_upload(await file.read(), key, file.content_type or "application/octet-stream")
    docs = list(rider.documents or [])
    # Replace existing doc of same type
    docs = [d for d in docs if d.get("type") != doc_type]
    docs.append({
        "type": doc_type,
        "url": url,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    })
    rider.documents = docs
    # Reset to pending if previously rejected
    if rider.verification_status == "rejected":
        rider.verification_status = "pending"
        rider.rejection_reason = None
    await db.commit()
    return {"ok": True, "url": url, "documents": rider.documents}
