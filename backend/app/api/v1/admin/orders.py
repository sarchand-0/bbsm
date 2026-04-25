import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.notifications import create_notification
from app.models.delivery import OrderEvent
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminOrderCustomer,
    AdminOrderItemOut,
    AdminOrderOut,
    AdminOrderSummaryOut,
    OrderStatusUpdateIn,
)

router = APIRouter(prefix="/admin/orders", tags=["admin"])

_staff_or_admin = require_role(UserRole.staff, UserRole.admin)


async def _build_detail(order: Order, db: AsyncSession) -> AdminOrderOut:
    customer = await db.get(User, order.user_id)
    items_rows = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    items = [AdminOrderItemOut.model_validate(i) for i in items_rows.scalars()]
    out = AdminOrderOut.model_validate(order)
    out.customer = AdminOrderCustomer.model_validate(customer) if customer else None
    out.items = items
    return out


@router.get("", response_model=list[AdminOrderSummaryOut])
async def list_orders(
    status: OrderStatus | None = Query(default=None),
    customer_email: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if status:
        filters.append(Order.status == status)
    if from_date:
        filters.append(Order.placed_at >= from_date)
    if to_date:
        filters.append(Order.placed_at <= to_date)

    # filter by customer email requires join
    user_ids: list[uuid.UUID] | None = None
    if customer_email:
        term = f"%{customer_email}%"
        user_rows = await db.execute(
            select(User.id).where(User.email.ilike(term))
        )
        user_ids = [r for r in user_rows.scalars()]
        if not user_ids:
            return []
        filters.append(Order.user_id.in_(user_ids))

    stmt = (
        select(Order)
        .where(*filters)
        .order_by(Order.placed_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = await db.execute(stmt)
    orders = list(rows.scalars())

    result = []
    for o in orders:
        count_rows = await db.execute(
            select(OrderItem).where(OrderItem.order_id == o.id)
        )
        item_count = sum(i.quantity for i in count_rows.scalars())
        customer = await db.get(User, o.user_id)
        result.append(AdminOrderSummaryOut(
            id=o.id,
            status=o.status,
            total=float(o.total),
            item_count=item_count,
            placed_at=o.placed_at,
            customer_name=customer.full_name if customer else "Unknown",
            customer_email=customer.email if customer else "",
        ))
    return result


@router.get("/{order_id}", response_model=AdminOrderOut)
async def get_order(
    order_id: uuid.UUID,
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return await _build_detail(order, db)


@router.patch("/{order_id}/status", response_model=AdminOrderOut)
async def update_order_status(
    order_id: uuid.UUID,
    body: OrderStatusUpdateIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in (UserRole.staff, UserRole.admin):
        raise HTTPException(403)
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status in (OrderStatus.delivered, OrderStatus.cancelled):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot change status of a {order.status} order",
        )

    old_status = order.status
    order.status = body.status
    order.status_updated_at = datetime.utcnow()

    # Emit event
    db.add(OrderEvent(
        order_id=order.id,
        status=body.status.value,
        note=body.note if hasattr(body, "note") else None,
        created_by_id=current_user.id,
    ))

    # Notify customer
    status_labels = {
        "confirmed":  ("Order Confirmed", "Your order has been confirmed and is being prepared."),
        "packed":     ("Order Packed", "Your order is packed and ready for pickup by our rider."),
        "shipped":    ("Order Shipped", "Your order is on the way!"),
        "delivered":  ("Order Delivered!", "Your order has been delivered. Enjoy!"),
        "cancelled":  ("Order Cancelled", "Your order has been cancelled."),
    }
    if body.status.value in status_labels:
        title, msg = status_labels[body.status.value]
        await create_notification(
            db,
            user_id=order.user_id,
            type=f"order_{body.status.value}",
            title=title,
            body=msg,
            data={"order_id": str(order.id)},
        )

    await db.commit()
    await db.refresh(order)
    return await _build_detail(order, db)
