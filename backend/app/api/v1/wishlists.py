import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.product import Product, ProductStatus
from app.models.user import User
from app.models.wishlist import Wishlist
from app.schemas.cart import WishlistItemOut
from app.schemas.catalog import CategoryOut, ProductOut

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


async def _product_out(product: Product, db: AsyncSession) -> ProductOut:
    from app.models.category import Category
    cat = None
    if product.category_id:
        row = await db.get(Category, product.category_id)
        cat = CategoryOut.model_validate(row) if row else None
    p = ProductOut.model_validate(product)
    p.category = cat
    return p


@router.get("", response_model=list[WishlistItemOut])
async def get_wishlist(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Wishlist)
        .where(Wishlist.user_id == user.id)
        .order_by(Wishlist.created_at.desc())
    )
    items = list(rows.scalars())
    result = []
    for w in items:
        product = await db.scalar(
            select(Product).where(
                Product.id == w.product_id,
                Product.status != ProductStatus.archived,
            )
        )
        if not product:
            continue
        po = await _product_out(product, db)
        result.append(WishlistItemOut(
            product_id=w.product_id,
            product=po,
            created_at=w.created_at,
        ))
    return result


@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    product_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    product = await db.scalar(
        select(Product).where(
            Product.id == product_id,
            Product.status == ProductStatus.active,
        )
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = await db.scalar(
        select(Wishlist).where(
            Wishlist.user_id == user.id,
            Wishlist.product_id == product_id,
        )
    )
    if existing:
        return {"detail": "Already in wishlist"}

    db.add(Wishlist(user_id=user.id, product_id=product_id))
    await db.commit()
    return {"detail": "Added to wishlist"}


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    product_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    w = await db.scalar(
        select(Wishlist).where(
            Wishlist.user_id == user.id,
            Wishlist.product_id == product_id,
        )
    )
    if not w:
        raise HTTPException(status_code=404, detail="Not in wishlist")
    await db.delete(w)
    await db.commit()
