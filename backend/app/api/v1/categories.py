from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.category import Category
from app.schemas.catalog import CategoryOut, CategoryTreeOut

router = APIRouter(prefix="/categories", tags=["catalog"])


def _build_tree(cats: list[Category]) -> list[CategoryTreeOut]:
    """Build a nested tree from a flat list of categories."""
    by_id: dict = {c.id: CategoryTreeOut.model_validate(c) for c in cats}
    roots: list[CategoryTreeOut] = []
    for node in by_id.values():
        if node.parent_id and node.parent_id in by_id:
            by_id[node.parent_id].children.append(node)
        else:
            roots.append(node)
    roots.sort(key=lambda c: c.sort_order)
    return roots


@router.get("", response_model=list[CategoryTreeOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(select(Category).order_by(Category.sort_order))
    cats = rows.scalars().all()
    return _build_tree(list(cats))


@router.get("/{slug}", response_model=CategoryOut)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    cat = await db.scalar(select(Category).where(Category.slug == slug))
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return CategoryOut.model_validate(cat)
