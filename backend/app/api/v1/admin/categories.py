import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.database import get_db
from app.models.category import Category
from app.models.user import UserRole
from app.schemas.admin import AdminCategoryIn, AdminCategoryOut, AdminCategoryUpdateIn, CategoryReorderIn

router = APIRouter(prefix="/admin/categories", tags=["admin"])

_admin_only = require_role(UserRole.admin)


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


@router.get("", response_model=list[AdminCategoryOut])
async def list_categories(
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(select(Category).order_by(Category.sort_order.asc()))
    return [AdminCategoryOut.model_validate(c) for c in rows.scalars()]


@router.post("", response_model=AdminCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: AdminCategoryIn,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    slug = body.slug or _slugify(body.name)
    existing = await db.scalar(select(Category).where(Category.slug == slug))
    if existing:
        raise HTTPException(status_code=409, detail="Category slug already exists")

    cat = Category(
        name=body.name,
        slug=slug,
        icon=body.icon,
        color_hex=body.color_hex,
        sort_order=body.sort_order,
        parent_id=body.parent_id,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return AdminCategoryOut.model_validate(cat)


@router.patch("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_categories(
    body: CategoryReorderIn,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    for idx, cat_id in enumerate(body.ids):
        cat = await db.get(Category, cat_id)
        if cat:
            cat.sort_order = idx
    await db.commit()


@router.patch("/{category_id}", response_model=AdminCategoryOut)
async def update_category(
    category_id: uuid.UUID,
    body: AdminCategoryUpdateIn,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    updates = body.model_dump(exclude_unset=True)
    if "name" in updates and "slug" not in updates:
        updates["slug"] = _slugify(updates["name"])
    for field, value in updates.items():
        setattr(cat, field, value)

    await db.commit()
    await db.refresh(cat)
    return AdminCategoryOut.model_validate(cat)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    _=Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
):
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(cat)
    await db.commit()
