"""Public discount code validation — no auth required."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.discount import DiscountCode, DiscountType

router = APIRouter(prefix="/discounts", tags=["discounts"])


class ValidateIn(BaseModel):
    code: str
    subtotal: float


@router.post("/validate")
async def validate_discount(body: ValidateIn, db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    dc = await db.scalar(
        select(DiscountCode).where(
            DiscountCode.code == body.code.upper(),
            DiscountCode.active.is_(True),
        )
    )
    if not dc:
        raise HTTPException(400, "Invalid discount code")
    if dc.starts_at and dc.starts_at > now:
        raise HTTPException(400, "Code is not yet active")
    if dc.expires_at and dc.expires_at < now:
        raise HTTPException(400, "Code has expired")
    if dc.usage_limit is not None and dc.used_count >= dc.usage_limit:
        raise HTTPException(400, "Usage limit reached")

    if dc.type == DiscountType.percent:
        discount_amount = round(body.subtotal * float(dc.value) / 100, 2)
    else:
        discount_amount = min(float(dc.value), body.subtotal)

    return {
        "valid": True,
        "code": dc.code,
        "type": dc.type,
        "value": float(dc.value),
        "discount_amount": discount_amount,
        "final_total": round(body.subtotal - discount_amount, 2),
    }
