"""
Orders API — authenticated customers only.
Order placement is atomic: locks product rows, decrements stock, applies discount,
clears cart, and creates order in a single transaction.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.notifications import create_notification
from app.models.address import Address
from app.models.cart import Cart, CartItem
from app.models.delivery import Delivery, OrderEvent, Rider
from app.models.discount import DiscountCode, DiscountType
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import OrderOut, OrderSummaryOut, PlaceOrderIn

router = APIRouter(prefix="/orders", tags=["orders"])


# ─── POST /orders ─────────────────────────────────────────────────────────────

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def place_order(
    body: PlaceOrderIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate address belongs to user
    address = await db.scalar(
        select(Address).where(Address.id == body.address_id, Address.user_id == user.id)
    )
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    # Load cart items
    cart = await db.scalar(select(Cart).where(Cart.user_id == user.id))
    if not cart:
        raise HTTPException(status_code=400, detail="Cart is empty")

    cart_items_rows = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.id)
    )
    cart_items = list(cart_items_rows.scalars())
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Lock products with SELECT FOR UPDATE to prevent race conditions
    product_ids = [ci.product_id for ci in cart_items]
    locked_rows = await db.execute(
        select(Product)
        .where(Product.id.in_(product_ids))
        .with_for_update()
    )
    products: dict[uuid.UUID, Product] = {p.id: p for p in locked_rows.scalars()}

    # Validate stock
    for ci in cart_items:
        p = products.get(ci.product_id)
        if not p:
            raise HTTPException(status_code=409, detail=f"Product no longer available")
        if p.stock_qty < ci.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient stock for '{p.name}' (available: {p.stock_qty})",
            )

    # Calculate subtotal
    subtotal = sum(products[ci.product_id].price * ci.quantity for ci in cart_items)

    # Apply discount code
    discount_amount = 0.0
    discount_code_id = None
    if body.discount_code:
        now = datetime.utcnow()
        dc = await db.scalar(
            select(DiscountCode).where(
                DiscountCode.code == body.discount_code.upper(),
                DiscountCode.active.is_(True),
            )
        )
        if not dc:
            raise HTTPException(status_code=400, detail="Invalid discount code")
        if dc.starts_at and dc.starts_at > now:
            raise HTTPException(status_code=400, detail="Discount code not yet active")
        if dc.expires_at and dc.expires_at < now:
            raise HTTPException(status_code=400, detail="Discount code has expired")
        if dc.usage_limit is not None and dc.used_count >= dc.usage_limit:
            raise HTTPException(status_code=400, detail="Discount code usage limit reached")

        if dc.type == DiscountType.percent:
            discount_amount = round(float(subtotal) * float(dc.value) / 100, 2)
        else:
            discount_amount = min(float(dc.value), float(subtotal))

        dc.used_count += 1
        discount_code_id = dc.id

    total = round(float(subtotal) - discount_amount, 2)

    # Create order
    order = Order(
        user_id=user.id,
        address_id=address.id,
        status=OrderStatus.pending,
        subtotal=float(subtotal),
        discount=discount_amount,
        total=total,
        discount_code_id=discount_code_id,
        notes=body.notes,
        placed_at=datetime.utcnow(),
        status_updated_at=datetime.utcnow(),
    )
    db.add(order)
    await db.flush()  # get order.id

    # Create order items + decrement stock
    for ci in cart_items:
        p = products[ci.product_id]
        db.add(OrderItem(
            order_id=order.id,
            product_id=p.id,
            product_name=p.name,
            unit_price=float(p.price),
            quantity=ci.quantity,
            subtotal=round(float(p.price) * ci.quantity, 2),
        ))
        p.stock_qty -= ci.quantity

    # Clear cart
    for ci in cart_items:
        await db.delete(ci)

    # Create initial order event
    db.add(OrderEvent(
        order_id=order.id,
        status="pending",
        note="Order placed",
        created_by_id=user.id,
    ))

    # Create delivery record (unassigned)
    import random
    import string
    otp = "".join(random.choices(string.digits, k=4))
    db.add(Delivery(order_id=order.id, delivery_otp=otp))

    await db.commit()
    await db.refresh(order)

    # Non-critical: send in-app notification (don't roll back order if this fails)
    try:
        await create_notification(
            db,
            user_id=user.id,
            type="order_placed",
            title="Order Received!",
            body="We've received your order and it's being prepared.",
            data={"order_id": str(order.id)},
        )
        await db.commit()
    except Exception:
        await db.rollback()

    # Load items for response
    items_rows = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    order.items = list(items_rows.scalars())
    return OrderOut.model_validate(order)


# ─── GET /orders ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[OrderSummaryOut])
async def list_my_orders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Order)
        .where(Order.user_id == user.id)
        .order_by(Order.placed_at.desc())
    )
    orders = list(rows.scalars())

    # Attach item_count from order_items
    result = []
    for o in orders:
        count_rows = await db.execute(
            select(OrderItem).where(OrderItem.order_id == o.id)
        )
        count = sum(i.quantity for i in count_rows.scalars())
        s = OrderSummaryOut.model_validate(o)
        s.item_count = count
        result.append(s)
    return result


# ─── GET /orders/{id} ─────────────────────────────────────────────────────────

@router.get("/{order_id}", response_model=OrderOut)
async def get_my_order(
    order_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await db.scalar(
        select(Order).where(Order.id == order_id, Order.user_id == user.id)
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items_rows = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    order.items = list(items_rows.scalars())
    return OrderOut.model_validate(order)


# ─── Tracking schemas ─────────────────────────────────────────────────────────

class OrderEventOut(BaseModel):
    id: uuid.UUID
    status: str
    note: str | None
    lat: float | None
    lng: float | None
    created_at: datetime
    model_config = {"from_attributes": True}


class RiderCardOut(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None
    vehicle_type: str
    license_plate: str | None
    current_lat: float | None
    current_lng: float | None
    last_location_at: datetime | None
    rating: float | None


class TrackingOut(BaseModel):
    order_id: uuid.UUID
    status: str
    estimated_delivery_at: datetime | None
    rider: RiderCardOut | None
    events: list[OrderEventOut]


class RiderLocationOut(BaseModel):
    lat: float | None
    lng: float | None
    last_updated_at: datetime | None


class RateDeliveryIn(BaseModel):
    rating: int  # 1-5
    comment: str | None = None


class ConfirmOtpIn(BaseModel):
    otp: str


# ─── GET /orders/{id}/tracking ────────────────────────────────────────────────

@router.get("/{order_id}/tracking", response_model=TrackingOut)
async def track_order(
    order_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await db.scalar(select(Order).where(Order.id == order_id, Order.user_id == user.id))
    if not order:
        raise HTTPException(404, "Order not found")

    delivery = await db.scalar(select(Delivery).where(Delivery.order_id == order_id))
    events_res = await db.execute(
        select(OrderEvent).where(OrderEvent.order_id == order_id).order_by(OrderEvent.created_at.asc())
    )
    events = list(events_res.scalars())

    rider_card = None
    if delivery and delivery.rider_id:
        rider = await db.scalar(select(Rider).where(Rider.id == delivery.rider_id))
        if rider:
            rider_user = await db.scalar(select(User).where(User.id == rider.user_id))
            rider_card = RiderCardOut(
                id=rider.id,
                name=rider_user.full_name if rider_user else "Rider",
                phone=rider_user.phone if rider_user else None,
                vehicle_type=rider.vehicle_type,
                license_plate=rider.license_plate,
                current_lat=delivery.rider_lat,
                current_lng=delivery.rider_lng,
                last_location_at=rider.last_location_at,
                rating=float(rider.rating) if rider.rating else None,
            )

    return TrackingOut(
        order_id=order.id,
        status=order.status.value,
        estimated_delivery_at=delivery.estimated_delivery_at if delivery else None,
        rider=rider_card,
        events=[OrderEventOut.model_validate(e) for e in events],
    )


# ─── GET /orders/{id}/rider-location ─────────────────────────────────────────

@router.get("/{order_id}/rider-location", response_model=RiderLocationOut)
async def rider_location_poll(
    order_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await db.scalar(select(Order).where(Order.id == order_id, Order.user_id == user.id))
    if not order:
        raise HTTPException(404, "Order not found")

    delivery = await db.scalar(select(Delivery).where(Delivery.order_id == order_id))
    if not delivery or not delivery.rider_id:
        return RiderLocationOut(lat=None, lng=None, last_updated_at=None)

    rider = await db.scalar(select(Rider).where(Rider.id == delivery.rider_id))
    return RiderLocationOut(
        lat=delivery.rider_lat,
        lng=delivery.rider_lng,
        last_updated_at=rider.last_location_at if rider else None,
    )


# ─── POST /orders/{id}/confirm-delivery ──────────────────────────────────────

@router.post("/{order_id}/confirm-delivery")
async def confirm_delivery_otp(
    order_id: uuid.UUID,
    body: ConfirmOtpIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await db.scalar(select(Order).where(Order.id == order_id, Order.user_id == user.id))
    if not order:
        raise HTTPException(404, "Order not found")
    delivery = await db.scalar(select(Delivery).where(Delivery.order_id == order_id))
    if not delivery:
        raise HTTPException(404, "Delivery not found")
    if delivery.delivery_otp and body.otp != delivery.delivery_otp:
        raise HTTPException(400, "Incorrect OTP")
    delivery.otp_verified = True
    await db.commit()
    return {"ok": True}


# ─── POST /orders/{id}/rate ───────────────────────────────────────────────────

@router.post("/{order_id}/rate")
async def rate_delivery(
    order_id: uuid.UUID,
    body: RateDeliveryIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not 1 <= body.rating <= 5:
        raise HTTPException(400, "Rating must be 1–5")
    order = await db.scalar(select(Order).where(Order.id == order_id, Order.user_id == user.id))
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != OrderStatus.delivered:
        raise HTTPException(400, "Can only rate delivered orders")

    delivery = await db.scalar(select(Delivery).where(Delivery.order_id == order_id))
    if not delivery:
        raise HTTPException(404, "Delivery not found")

    delivery.rating = body.rating
    delivery.rating_comment = body.comment

    if delivery.rider_id:
        rider = await db.scalar(select(Rider).where(Rider.id == delivery.rider_id))
        if rider:
            all_ratings_res = await db.execute(
                select(Delivery.rating).where(
                    Delivery.rider_id == rider.id, Delivery.rating.isnot(None)
                )
            )
            ratings = [r for r in all_ratings_res.scalars() if r is not None]
            ratings.append(body.rating)
            rider.rating = round(sum(ratings) / len(ratings), 2)

    await db.commit()
    return {"ok": True}
