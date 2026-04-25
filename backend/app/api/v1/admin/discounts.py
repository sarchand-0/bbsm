import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.database import get_db
from app.models.discount import DiscountCode
from app.models.user import UserRole
from app.schemas.admin import AdminDiscountCodeIn, AdminDiscountCodeOut, AdminDiscountCodeUpdateIn

router = APIRouter(prefix="/admin/discounts", tags=["admin"])

_admin_only = require_role(UserRole.admin)


@router.get("", response_model=list[AdminDiscountCodeOut])
async def list_discounts(
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(select(DiscountCode).order_by(DiscountCode.created_at.desc()))
    return [AdminDiscountCodeOut.model_validate(d) for d in rows.scalars()]


@router.post("", response_model=AdminDiscountCodeOut, status_code=status.HTTP_201_CREATED)
async def create_discount(
    body: AdminDiscountCodeIn,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(DiscountCode).where(DiscountCode.code == body.code.upper())
    )
    if existing:
        raise HTTPException(status_code=409, detail="Discount code already exists")

    dc = DiscountCode(
        code=body.code.upper(),
        type=body.type,
        value=body.value,
        usage_limit=body.usage_limit,
        starts_at=body.starts_at,
        expires_at=body.expires_at,
        active=body.active,
    )
    db.add(dc)
    await db.commit()
    await db.refresh(dc)
    return AdminDiscountCodeOut.model_validate(dc)


@router.patch("/{discount_id}", response_model=AdminDiscountCodeOut)
async def update_discount(
    discount_id: uuid.UUID,
    body: AdminDiscountCodeUpdateIn,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    dc = await db.get(DiscountCode, discount_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Discount code not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(dc, field, value)

    await db.commit()
    await db.refresh(dc)
    return AdminDiscountCodeOut.model_validate(dc)


@router.delete("/{discount_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discount(
    discount_id: uuid.UUID,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    dc = await db.get(DiscountCode, discount_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Discount code not found")
    await db.delete(dc)
    await db.commit()
