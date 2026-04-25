import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.category import Category
from app.models.product import Product, ProductStatus
from app.schemas.catalog import (
    CategoryOut,
    PaginationMeta,
    ProductDetailOut,
    ProductListOut,
    ProductOut,
)

router = APIRouter(prefix="/products", tags=["catalog"])

def _sort(key: str):
    """Return (primary, secondary) sort columns — secondary id keeps pages stable."""
    primary = {
        "newest":     Product.created_at.desc(),
        "price_asc":  Product.price.asc(),
        "price_desc": Product.price.desc(),
        "name_asc":   Product.name.asc(),
        "name_desc":  Product.name.desc(),
    }.get(key, Product.created_at.desc())
    return primary, Product.id.asc()


async def _attach_categories(
    products: list[Product], db: AsyncSession
) -> list[ProductOut]:
    """Batch-load categories and merge into product schemas — 1 extra query."""
    cat_ids = list({p.category_id for p in products if p.category_id})
    cat_map: dict[uuid.UUID, CategoryOut] = {}
    if cat_ids:
        rows = await db.execute(select(Category).where(Category.id.in_(cat_ids)))
        for cat in rows.scalars():
            cat_map[cat.id] = CategoryOut.model_validate(cat)

    out = []
    for p in products:
        d = ProductOut.model_validate(p)
        d.category = cat_map.get(p.category_id) if p.category_id else None
        out.append(d)
    return out


async def _attach_category_detail(p: Product, db: AsyncSession) -> ProductDetailOut:
    """Load category for a single product."""
    cat = None
    if p.category_id:
        row = await db.get(Category, p.category_id)
        cat = CategoryOut.model_validate(row) if row else None
    d = ProductDetailOut.model_validate(p)
    d.category = cat
    return d


@router.get("/featured", response_model=list[ProductOut])
async def featured_products(
    limit: int = Query(default=12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Product)
        .where(Product.status == ProductStatus.active, Product.is_featured.is_(True))
        .order_by(Product.created_at.desc())
        .limit(limit)
    )
    rows = await db.execute(stmt)
    products = list(rows.scalars().all())
    return await _attach_categories(products, db)


@router.get("", response_model=ProductListOut)
async def list_products(
    category: str | None = Query(default=None, description="Category slug"),
    search: str | None = Query(default=None, description="Text search on name"),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    featured: bool | None = Query(default=None),
    in_stock: bool | None = Query(default=None, description="Only show in-stock products"),
    sort: str = Query(default="newest", pattern="^(newest|price_asc|price_desc|name_asc|name_desc)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = [Product.status == ProductStatus.active]

    if category:
        cat_row = await db.scalar(select(Category).where(Category.slug == category))
        if not cat_row:
            raise HTTPException(status_code=404, detail="Category not found")
        filters.append(Product.category_id == cat_row.id)

    if search:
        term = f"%{search}%"
        filters.append(
            or_(Product.name.ilike(term), Product.description.ilike(term))
        )

    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if featured is not None:
        filters.append(Product.is_featured.is_(featured))
    if in_stock:
        filters.append(Product.stock_qty > 0)

    # Total count
    total: int = await db.scalar(
        select(func.count()).select_from(Product).where(*filters)
    )

    # Paginated results
    stmt = (
        select(Product)
        .where(*filters)
        .order_by(*_sort(sort))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = await db.execute(stmt)
    products = list(rows.scalars().all())
    items = await _attach_categories(products, db)

    return ProductListOut(
        items=items,
        meta=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=math.ceil(total / per_page) if total else 0,
        ),
    )


@router.get("/{slug}", response_model=ProductDetailOut)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    product = await db.scalar(
        select(Product).where(Product.slug == slug, Product.status != ProductStatus.archived)
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return await _attach_category_detail(product, db)
