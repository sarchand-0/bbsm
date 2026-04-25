"""
Cart API — dual-mode: PostgreSQL for authenticated users, Redis for guests.
Guest session identified by `session_id` cookie (UUID, issued on first cart touch).
"""
import json
import uuid
from typing import Any

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, optional_current_user
from app.core.database import get_db
from app.core.redis import get_redis
from app.models.cart import Cart, CartItem
from app.models.product import Product, ProductStatus
from app.models.user import User
from app.schemas.cart import CartItemIn, CartItemOut, CartItemUpdateIn, CartOut
from app.schemas.catalog import CategoryOut, ProductOut

router = APIRouter(prefix="/cart", tags=["cart"])

GUEST_CART_TTL = 60 * 60 * 24 * 7  # 7 days


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _guest_key(session_id: str) -> str:
    return f"guest:cart:{session_id}"


async def _product_out(product: Product, db: AsyncSession) -> ProductOut:
    from app.models.category import Category
    cat = None
    if product.category_id:
        row = await db.get(Category, product.category_id)
        cat = CategoryOut.model_validate(row) if row else None
    p = ProductOut.model_validate(product)
    p.category = cat
    return p


def _cart_out_from_redis(data: dict[str, Any], products: dict[uuid.UUID, ProductOut]) -> CartOut:
    items: list[CartItemOut] = []
    for pid_str, qty in data.items():
        pid = uuid.UUID(pid_str)
        if pid not in products:
            continue
        p = products[pid]
        sub = round(p.price * qty, 2)
        items.append(CartItemOut(
            item_id=pid_str,
            product_id=pid,
            product=p,
            quantity=qty,
            subtotal=sub,
        ))
    total = round(sum(i.subtotal for i in items), 2)
    return CartOut(items=items, total=total, item_count=sum(i.quantity for i in items))


async def _load_products_for_pids(
    pids: list[uuid.UUID], db: AsyncSession
) -> dict[uuid.UUID, ProductOut]:
    if not pids:
        return {}
    from app.models.category import Category
    from sqlalchemy import select
    rows = await db.execute(select(Product).where(Product.id.in_(pids)))
    products = list(rows.scalars())

    cat_ids = list({p.category_id for p in products if p.category_id})
    cat_map: dict[uuid.UUID, CategoryOut] = {}
    if cat_ids:
        cats = await db.execute(
            select(Category).where(Category.id.in_(cat_ids))
        )
        for c in cats.scalars():
            cat_map[c.id] = CategoryOut.model_validate(c)

    result: dict[uuid.UUID, ProductOut] = {}
    for p in products:
        po = ProductOut.model_validate(p)
        po.category = cat_map.get(p.category_id) if p.category_id else None
        result[p.id] = po
    return result


async def _get_or_create_db_cart(user: User, db: AsyncSession) -> Cart:
    cart = await db.scalar(select(Cart).where(Cart.user_id == user.id))
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        await db.flush()
    return cart


async def _db_cart_out(cart: Cart, db: AsyncSession) -> CartOut:
    rows = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.id)
    )
    db_items = list(rows.scalars())

    pids = [item.product_id for item in db_items if item.product_id]
    products = await _load_products_for_pids(pids, db)

    items: list[CartItemOut] = []
    for ci in db_items:
        if not ci.product_id or ci.product_id not in products:
            continue
        p = products[ci.product_id]
        sub = round(p.price * ci.quantity, 2)
        items.append(CartItemOut(
            item_id=str(ci.id),
            product_id=ci.product_id,
            product=p,
            quantity=ci.quantity,
            subtotal=sub,
        ))

    total = round(sum(i.subtotal for i in items), 2)
    return CartOut(items=items, total=total, item_count=sum(i.quantity for i in items))


def _ensure_session(response: Response, session_id: str | None) -> str:
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie("session_id", session_id, max_age=GUEST_CART_TTL, httponly=True, samesite="lax")
    return session_id


# ─── GET /cart ────────────────────────────────────────────────────────────────

@router.get("", response_model=CartOut)
async def get_cart(
    response: Response,
    session_id: str | None = Cookie(default=None),
    user: User | None = Depends(optional_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    if user:
        cart = await _get_or_create_db_cart(user, db)
        await db.commit()
        return await _db_cart_out(cart, db)

    session_id = _ensure_session(response, session_id)
    raw = await redis.get(_guest_key(session_id))
    data: dict[str, int] = json.loads(raw) if raw else {}
    pids = [uuid.UUID(k) for k in data]
    products = await _load_products_for_pids(pids, db)
    return _cart_out_from_redis(data, products)


# ─── POST /cart/items ─────────────────────────────────────────────────────────

@router.post("/items", response_model=CartOut, status_code=status.HTTP_200_OK)
async def add_item(
    body: CartItemIn,
    response: Response,
    session_id: str | None = Cookie(default=None),
    user: User | None = Depends(optional_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    product = await db.scalar(
        select(Product).where(
            Product.id == body.product_id,
            Product.status == ProductStatus.active,
        )
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or unavailable")
    if product.stock_qty < body.quantity:
        raise HTTPException(status_code=409, detail="Insufficient stock")

    if user:
        cart = await _get_or_create_db_cart(user, db)
        item = await db.scalar(
            select(CartItem).where(
                CartItem.cart_id == cart.id,
                CartItem.product_id == body.product_id,
            )
        )
        if item:
            new_qty = item.quantity + body.quantity
            if product.stock_qty < new_qty:
                raise HTTPException(status_code=409, detail="Insufficient stock")
            item.quantity = new_qty
        else:
            db.add(CartItem(cart_id=cart.id, product_id=body.product_id, quantity=body.quantity))
        await db.commit()
        return await _db_cart_out(cart, db)

    session_id = _ensure_session(response, session_id)
    key = _guest_key(session_id)
    raw = await redis.get(key)
    data: dict[str, int] = json.loads(raw) if raw else {}
    pid_str = str(body.product_id)
    current_qty = data.get(pid_str, 0)
    new_qty = current_qty + body.quantity
    if product.stock_qty < new_qty:
        raise HTTPException(status_code=409, detail="Insufficient stock")
    data[pid_str] = new_qty
    await redis.setex(key, GUEST_CART_TTL, json.dumps(data))
    pids = [uuid.UUID(k) for k in data]
    products = await _load_products_for_pids(pids, db)
    return _cart_out_from_redis(data, products)


# ─── PATCH /cart/items/{item_id} ──────────────────────────────────────────────

@router.patch("/items/{item_id}", response_model=CartOut)
async def update_item(
    item_id: str,
    body: CartItemUpdateIn,
    response: Response,
    session_id: str | None = Cookie(default=None),
    user: User | None = Depends(optional_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    if user:
        try:
            item_uuid = uuid.UUID(item_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Item not found")
        item = await db.get(CartItem, item_uuid)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        cart = await db.get(Cart, item.cart_id)
        if not cart or cart.user_id != user.id:
            raise HTTPException(status_code=404, detail="Item not found")
        product = await db.get(Product, item.product_id)
        if product and product.stock_qty < body.quantity:
            raise HTTPException(status_code=409, detail="Insufficient stock")
        item.quantity = body.quantity
        await db.commit()
        return await _db_cart_out(cart, db)

    session_id = _ensure_session(response, session_id)
    key = _guest_key(session_id)
    raw = await redis.get(key)
    data: dict[str, int] = json.loads(raw) if raw else {}
    if item_id not in data:
        raise HTTPException(status_code=404, detail="Item not found")
    product = await db.scalar(select(Product).where(Product.id == uuid.UUID(item_id)))
    if product and product.stock_qty < body.quantity:
        raise HTTPException(status_code=409, detail="Insufficient stock")
    data[item_id] = body.quantity
    await redis.setex(key, GUEST_CART_TTL, json.dumps(data))
    pids = [uuid.UUID(k) for k in data]
    products = await _load_products_for_pids(pids, db)
    return _cart_out_from_redis(data, products)


# ─── DELETE /cart/items/{item_id} ────────────────────────────────────────────

@router.delete("/items/{item_id}", response_model=CartOut)
async def remove_item(
    item_id: str,
    response: Response,
    session_id: str | None = Cookie(default=None),
    user: User | None = Depends(optional_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    if user:
        try:
            item_uuid = uuid.UUID(item_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Item not found")
        item = await db.get(CartItem, item_uuid)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        cart = await db.get(Cart, item.cart_id)
        if not cart or cart.user_id != user.id:
            raise HTTPException(status_code=404, detail="Item not found")
        await db.delete(item)
        await db.commit()
        return await _db_cart_out(cart, db)

    session_id = _ensure_session(response, session_id)
    key = _guest_key(session_id)
    raw = await redis.get(key)
    data: dict[str, int] = json.loads(raw) if raw else {}
    data.pop(item_id, None)
    await redis.setex(key, GUEST_CART_TTL, json.dumps(data))
    pids = [uuid.UUID(k) for k in data]
    products = await _load_products_for_pids(pids, db)
    return _cart_out_from_redis(data, products)


# ─── DELETE /cart ─────────────────────────────────────────────────────────────

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    response: Response,
    session_id: str | None = Cookie(default=None),
    user: User | None = Depends(optional_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    if user:
        cart = await db.scalar(select(Cart).where(Cart.user_id == user.id))
        if cart:
            items = await db.execute(select(CartItem).where(CartItem.cart_id == cart.id))
            for item in items.scalars():
                await db.delete(item)
            await db.commit()
        return

    session_id = _ensure_session(response, session_id)
    await redis.delete(_guest_key(session_id))
