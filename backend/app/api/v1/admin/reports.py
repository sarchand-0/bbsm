"""
Admin Reports API — sales summary, top products, top customers.
Supports JSON and CSV response formats.
"""
import csv
import io
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.database import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User, UserRole
from app.schemas.admin import RevenueDataPoint, SalesReportOut, TopCustomerOut, TopProductOut

router = APIRouter(prefix="/admin/reports", tags=["admin"])

_staff_or_admin = require_role(UserRole.staff, UserRole.admin)


@router.get("/sales")
async def sales_report(
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    format: str = Query(default="json", pattern="^(json|csv)$"),
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    if not from_date:
        from_date = datetime.utcnow() - timedelta(days=30)
    if not to_date:
        to_date = datetime.utcnow()

    filters = [
        Order.placed_at >= from_date,
        Order.placed_at <= to_date,
        Order.status != OrderStatus.cancelled,
    ]

    totals = await db.execute(
        select(
            func.count(Order.id).label("total_orders"),
            func.coalesce(func.sum(Order.total), 0).label("total_revenue"),
            func.coalesce(func.sum(Order.discount), 0).label("total_discount"),
        ).where(*filters)
    )
    row = totals.first()
    total_orders = row.total_orders or 0
    total_revenue = float(row.total_revenue or 0)
    total_discount = float(row.total_discount or 0)

    daily = await db.execute(
        select(
            func.date(Order.placed_at).label("day"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .where(*filters)
        .group_by(func.date(Order.placed_at))
        .order_by(func.date(Order.placed_at).asc())
    )
    data = [
        RevenueDataPoint(date=str(r.day), revenue=float(r.revenue), orders=r.orders)
        for r in daily
    ]

    report = SalesReportOut(
        from_date=from_date.date().isoformat(),
        to_date=to_date.date().isoformat(),
        total_orders=total_orders,
        total_revenue=total_revenue,
        total_discount=total_discount,
        net_revenue=round(total_revenue - total_discount, 2),
        data=data,
    )

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["date", "orders", "revenue"])
        for d in data:
            writer.writerow([d.date, d.orders, d.revenue])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=sales_report.csv"},
        )

    return report


@router.get("/top-products")
async def top_products(
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=10, ge=1, le=50),
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    since = from_date or (datetime.utcnow() - timedelta(days=days))
    until = to_date or datetime.utcnow()

    rows = await db.execute(
        select(
            OrderItem.product_id,
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.subtotal).label("total_revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.placed_at >= since,
            Order.placed_at <= until,
            Order.status != OrderStatus.cancelled,
        )
        .group_by(OrderItem.product_id, OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    )

    from app.models.product import Product
    result = []
    for r in rows:
        product = await db.scalar(select(Product).where(Product.id == r.product_id)) if r.product_id else None
        result.append({
            "id": str(r.product_id) if r.product_id else "",
            "name": r.product_name,
            "sku": product.sku if product else None,
            "units_sold": int(r.total_sold or 0),
            "revenue": float(r.total_revenue or 0),
        })
    return result


@router.get("/top-customers")
async def top_customers(
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=10, ge=1, le=50),
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    since = from_date or (datetime.utcnow() - timedelta(days=days))
    until = to_date or datetime.utcnow()

    rows = await db.execute(
        select(
            Order.user_id,
            func.count(Order.id).label("order_count"),
            func.sum(Order.total).label("lifetime_value"),
        )
        .where(
            Order.placed_at >= since,
            Order.placed_at <= until,
            Order.status != OrderStatus.cancelled,
        )
        .group_by(Order.user_id)
        .order_by(func.sum(Order.total).desc())
        .limit(limit)
    )

    result = []
    for r in rows:
        user = await db.get(User, r.user_id)
        if user:
            result.append({
                "id": str(r.user_id),
                "full_name": user.full_name,
                "email": user.email,
                "order_count": int(r.order_count),
                "lifetime_value": float(r.lifetime_value or 0),
            })
    return result
