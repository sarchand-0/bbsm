import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.config import settings
from app.core.database import get_db
from app.models.promotion import Promotion
from app.models.user import UserRole
from app.schemas.admin import AdminPromotionIn, AdminPromotionOut, AdminPromotionUpdateIn

router = APIRouter(prefix="/admin/promotions", tags=["admin"])

_staff_or_admin = require_role(UserRole.staff, UserRole.admin)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.get("", response_model=list[AdminPromotionOut])
async def list_promotions(
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Promotion).order_by(Promotion.sort_order.asc(), Promotion.created_at.desc())
    )
    return [AdminPromotionOut.model_validate(p) for p in rows.scalars()]


@router.post("", response_model=AdminPromotionOut, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    body: AdminPromotionIn,
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    promo = Promotion(**body.model_dump())
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    return AdminPromotionOut.model_validate(promo)


@router.patch("/{promo_id}", response_model=AdminPromotionOut)
async def update_promotion(
    promo_id: uuid.UUID,
    body: AdminPromotionUpdateIn,
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    promo = await db.get(Promotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(promo, field, value)

    await db.commit()
    await db.refresh(promo)
    return AdminPromotionOut.model_validate(promo)


@router.delete("/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_promotion(
    promo_id: uuid.UUID,
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    promo = await db.get(Promotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    await db.delete(promo)
    await db.commit()


@router.post("/{promo_id}/image", response_model=AdminPromotionOut)
async def upload_promo_image(
    promo_id: uuid.UUID,
    file: UploadFile = File(...),
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    promo = await db.get(Promotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported image type")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    dest_dir = os.path.join(settings.UPLOAD_DIR, "promotions")
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, filename)

    async with aiofiles.open(dest_path, "wb") as out:
        content = await file.read()
        await out.write(content)

    promo.image_url = f"/uploads/promotions/{filename}"
    await db.commit()
    await db.refresh(promo)
    return AdminPromotionOut.model_validate(promo)
