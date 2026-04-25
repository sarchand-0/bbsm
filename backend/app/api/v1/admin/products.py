"""
Admin Products API — full CRUD + CSV bulk upload + image management.
CSV format: name,price,stock_qty,sku,description,category_slug,status,is_featured
"""
import csv
import io
import math
import re
import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.config import settings
from app.core.database import get_db
from app.models.category import Category
from app.models.product import Product, ProductStatus
from app.models.user import UserRole
from app.schemas.admin import AdminProductIn, AdminProductOut, AdminProductUpdateIn
from app.schemas.catalog import CategoryOut, PaginationMeta, ProductListOut

router = APIRouter(prefix="/admin/products", tags=["admin"])

_staff_or_admin = require_role(UserRole.staff, UserRole.admin)


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


async def _unique_slug(base: str, db: AsyncSession, exclude_id: uuid.UUID | None = None) -> str:
    slug = base
    i = 1
    while True:
        q = select(Product).where(Product.slug == slug)
        if exclude_id:
            q = q.where(Product.id != exclude_id)
        existing = await db.scalar(q)
        if not existing:
            return slug
        slug = f"{base}-{i}"
        i += 1


async def _attach_category(product: Product, db: AsyncSession) -> AdminProductOut:
    cat = None
    if product.category_id:
        row = await db.get(Category, product.category_id)
        cat = CategoryOut.model_validate(row) if row else None
    out = AdminProductOut.model_validate(product)
    out.category = cat
    return out


@router.get("", response_model=dict)
async def list_products(
    search: str | None = Query(default=None),
    category_id: uuid.UUID | None = Query(default=None),
    status: ProductStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if search:
        term = f"%{search}%"
        filters.append(or_(Product.name.ilike(term), Product.sku.ilike(term)))
    if category_id:
        filters.append(Product.category_id == category_id)
    if status:
        filters.append(Product.status == status)

    total = await db.scalar(
        select(func.count()).select_from(Product).where(*filters)
    ) or 0

    stmt = (
        select(Product)
        .where(*filters)
        .order_by(Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = await db.execute(stmt)
    products = list(rows.scalars())
    items = [await _attach_category(p, db) for p in products]

    return {
        "items": [i.model_dump() for i in items],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": math.ceil(total / per_page) if total else 0,
        },
    }


@router.post("", response_model=AdminProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: AdminProductIn,
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    slug = await _unique_slug(_slugify(body.name), db)
    product = Product(
        name=body.name,
        slug=slug,
        description=body.description,
        price=body.price,
        stock_qty=body.stock_qty,
        category_id=body.category_id,
        status=body.status,
        is_featured=body.is_featured,
        sku=body.sku,
        images=body.images,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return await _attach_category(product, db)


@router.patch("/{product_id}", response_model=AdminProductOut)
async def update_product(
    product_id: uuid.UUID,
    body: AdminProductUpdateIn,
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = body.model_dump(exclude_unset=True)
    if "name" in updates:
        updates["slug"] = await _unique_slug(_slugify(updates["name"]), db, exclude_id=product_id)
    for field, value in updates.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return await _attach_category(product, db)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_product(
    product_id: uuid.UUID,
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — sets status to archived."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = ProductStatus.archived
    await db.commit()


@router.post("/{product_id}/images/upload")
async def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=415, detail="File must be jpeg, png, webp, or gif")

    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        ext = "jpg"

    filename = f"{uuid.uuid4()}.{ext}"
    dest = Path(settings.UPLOAD_DIR) / "products" / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(await file.read())

    url = f"/uploads/products/{filename}"
    product.images = [*(product.images or []), url]
    await db.commit()
    return {"url": url, "images": product.images}


@router.post("/upload-csv")
async def bulk_upload_csv(
    file: UploadFile = File(...),
    _=Depends(_staff_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk create/update products from CSV.
    Required columns: name, price, stock_qty
    Optional columns: sku, description, category_slug, status, is_featured
    Upsert by SKU when sku is provided; always creates otherwise.
    """
    if file.content_type not in ("text/csv", "application/csv", "application/octet-stream"):
        raise HTTPException(status_code=415, detail="File must be a CSV")

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))

    created = updated = errors = 0

    for row_num, row in enumerate(reader, start=2):
        try:
            name = row.get("name", "").strip()
            price_str = row.get("price", "").strip()
            stock_str = row.get("stock_qty", "").strip()

            if not name or not price_str or not stock_str:
                errors += 1
                continue

            price = float(price_str)
            stock_qty = int(stock_str)
            sku = row.get("sku", "").strip() or None
            description = row.get("description", "").strip() or None
            category_slug = row.get("category_slug", "").strip() or None
            status_str = row.get("status", "active").strip()
            is_featured_str = row.get("is_featured", "false").strip().lower()

            prod_status = ProductStatus(status_str) if status_str in ProductStatus.__members__ else ProductStatus.active
            is_featured = is_featured_str in ("true", "1", "yes")

            category_id = None
            if category_slug:
                cat = await db.scalar(select(Category).where(Category.slug == category_slug))
                if cat:
                    category_id = cat.id

            # Upsert by SKU
            existing = None
            if sku:
                existing = await db.scalar(select(Product).where(Product.sku == sku))

            if existing:
                existing.name = name
                existing.price = price
                existing.stock_qty = stock_qty
                existing.description = description
                existing.category_id = category_id
                existing.status = prod_status
                existing.is_featured = is_featured
                updated += 1
            else:
                slug = await _unique_slug(_slugify(name), db)
                db.add(Product(
                    name=name,
                    slug=slug,
                    description=description,
                    price=price,
                    stock_qty=stock_qty,
                    sku=sku,
                    category_id=category_id,
                    status=prod_status,
                    is_featured=is_featured,
                    images=[],
                ))
                created += 1
        except Exception:
            errors += 1
            continue

    await db.commit()
    return {"created": created, "updated": updated, "errors": errors}


@router.get("/web-lookup")
async def web_lookup(
    q: str = Query(..., min_length=2),
    _=Depends(_staff_or_admin),
):
    """
    Search Open Food Facts for products matching q.
    Returns up to 5 candidates with name, image, and NPR price estimate.
    """
    results = []

    # Primary: Open Food Facts
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": q,
                    "search_simple": 1,
                    "action": "process",
                    "json": 1,
                    "page_size": 8,
                    "fields": "product_name,image_front_url,brands,quantity,categories_tags",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                for p in data.get("products", []):
                    name = p.get("product_name", "").strip()
                    image = p.get("image_front_url", "")
                    if not name or not image:
                        continue
                    results.append({
                        "name": name,
                        "image_url": image,
                        "brand": p.get("brands", ""),
                        "quantity": p.get("quantity", ""),
                        "price_npr": None,
                        "source": "openfoodfacts",
                    })
                    if len(results) >= 5:
                        break
    except Exception:
        pass

    # Fallback: DuckDuckGo instant answer for price hints (images only)
    if not results:
        try:
            async with httpx.AsyncClient(timeout=6) as client:
                resp = await client.get(
                    "https://api.duckduckgo.com/",
                    params={"q": q, "format": "json", "no_html": 1, "skip_disambig": 1},
                    headers={"User-Agent": "BBSM-Admin/1.0"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    image = data.get("Image", "")
                    abstract = data.get("AbstractText", "") or data.get("Answer", "")
                    if data.get("Heading") and image:
                        results.append({
                            "name": data["Heading"],
                            "image_url": image,
                            "brand": "",
                            "quantity": "",
                            "price_npr": None,
                            "source": "duckduckgo",
                        })
        except Exception:
            pass

    return {"query": q, "results": results, "rates": {
        "usd_npr": settings.EXCHANGE_RATE_USD_NPR,
        "inr_npr": settings.EXCHANGE_RATE_INR_NPR,
    }}
