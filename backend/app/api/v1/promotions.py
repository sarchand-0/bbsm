from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.promotion import Promotion
from app.schemas.catalog import PromotionOut

router = APIRouter(prefix="/promotions", tags=["catalog"])


@router.get("", response_model=list[PromotionOut])
async def list_promotions(db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()  # naive UTC — matches TIMESTAMP WITHOUT TIME ZONE columns
    stmt = (
        select(Promotion)
        .where(
            Promotion.active.is_(True),
            or_(Promotion.starts_at.is_(None), Promotion.starts_at <= now),
            or_(Promotion.ends_at.is_(None), Promotion.ends_at >= now),
        )
        .order_by(Promotion.sort_order.asc(), Promotion.created_at.desc())
    )
    rows = await db.execute(stmt)
    return [PromotionOut.model_validate(p) for p in rows.scalars()]
