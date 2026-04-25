from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.database import get_db
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.user import User, UserRole, UserStatus
from app.schemas.admin import DashboardStatsOut, RevenueDataPoint

router = APIRouter(prefix="/admin/dashboard", tags=["admin"])

_staff_or_admin = require_role(UserRole.staff, UserRole.admin)


@router.get("/stats", response_model=DashboardStatsOut)
async def get_stats(
    _user=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.utcnow().date()
    today_start = datetime(today.year, today.month, today.day)
    today_end = today_start + timedelta(days=1)

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    low_stock_threshold = 10

    today_orders = await db.scalar(
        select(func.count(Order.id)).where(
            Order.placed_at >= today_start,
            Order.placed_at < today_end,
            Order.status != OrderStatus.cancelled,
        )
    ) or 0

    today_revenue = await db.scalar(
        select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.placed_at >= today_start,
            Order.placed_at < today_end,
            Order.status != OrderStatus.cancelled,
        )
    ) or 0.0

    new_users_7d = await db.scalar(
        select(func.count(User.id)).where(
            User.created_at >= seven_days_ago,
            User.role == UserRole.customer,
        )
    ) or 0

    low_stock_count = await db.scalar(
        select(func.count(Product.id)).where(
            Product.stock_qty <= low_stock_threshold,
            Product.status != "archived",
        )
    ) or 0

    return DashboardStatsOut(
        today_orders=today_orders,
        today_revenue=float(today_revenue),
        new_users_7d=new_users_7d,
        low_stock_count=low_stock_count,
    )


@router.get("/revenue", response_model=list[RevenueDataPoint])
async def get_revenue_chart(
    days: int = Query(default=30, ge=1, le=365),
    _user=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)

    rows = await db.execute(
        select(
            func.date(Order.placed_at).label("day"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .where(
            Order.placed_at >= since,
            Order.status != OrderStatus.cancelled,
        )
        .group_by(func.date(Order.placed_at))
        .order_by(func.date(Order.placed_at).asc())
    )

    return [
        RevenueDataPoint(date=str(row.day), revenue=float(row.revenue), orders=row.orders)
        for row in rows
    ]
