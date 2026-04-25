import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.database import get_db
from app.models.delivery import Rider
from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.schemas.admin import AdminUserOut, UserRoleUpdateIn, UserStatusUpdateIn
from app.schemas.cart import OrderSummaryOut

router = APIRouter(prefix="/admin/users", tags=["admin"])

_admin_only = require_role(UserRole.admin)


async def _enrich(user: User, db: AsyncSession) -> AdminUserOut:
    order_count = await db.scalar(
        select(func.count(Order.id)).where(
            Order.user_id == user.id,
            Order.status != OrderStatus.cancelled,
        )
    ) or 0
    lifetime_value = await db.scalar(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.user_id == user.id,
            Order.status != OrderStatus.cancelled,
        )
    ) or 0.0

    out = AdminUserOut.model_validate(user)
    out.order_count = order_count
    out.lifetime_value = float(lifetime_value)
    return out


@router.get("", response_model=list[AdminUserOut])
async def list_users(
    search: str | None = Query(default=None),
    role: UserRole | None = Query(default=None),
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if search:
        term = f"%{search}%"
        from sqlalchemy import or_
        filters.append(
            or_(User.email.ilike(term), User.full_name.ilike(term))
        )
    if role:
        filters.append(User.role == role)

    stmt = select(User).order_by(User.created_at.desc())
    if filters:
        stmt = stmt.where(*filters)

    rows = await db.execute(stmt)
    users = list(rows.scalars())
    return [await _enrich(u, db) for u in users]


@router.get("/{user_id}", response_model=AdminUserOut)
async def get_user(
    user_id: uuid.UUID,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await _enrich(user, db)


@router.get("/{user_id}/orders", response_model=list[OrderSummaryOut])
async def get_user_orders(
    user_id: uuid.UUID,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.models.order import OrderItem
    rows = await db.execute(
        select(Order).where(Order.user_id == user_id).order_by(Order.placed_at.desc())
    )
    orders = list(rows.scalars())
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


@router.patch("/{user_id}/status", response_model=AdminUserOut)
async def update_user_status(
    user_id: uuid.UUID,
    body: UserStatusUpdateIn,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = body.status
    await db.commit()
    await db.refresh(user)
    return await _enrich(user, db)


@router.patch("/{user_id}/role", response_model=AdminUserOut)
async def update_user_role(
    user_id: uuid.UUID,
    body: UserRoleUpdateIn,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    old_role = user.role
    user.role = body.role
    # Auto-provision Rider profile when promoting to rider
    if body.role == UserRole.rider and old_role != UserRole.rider:
        existing_rider = await db.scalar(select(Rider).where(Rider.user_id == user_id))
        if not existing_rider:
            db.add(Rider(user_id=user.id, verification_status="pending"))
    await db.commit()
    await db.refresh(user)
    return await _enrich(user, db)
