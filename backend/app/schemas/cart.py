import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.order import OrderStatus
from app.schemas.catalog import ProductOut


# ─── Cart ─────────────────────────────────────────────────────────────────────

class CartItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1, le=100)


class CartItemUpdateIn(BaseModel):
    quantity: int = Field(ge=1, le=100)


class CartItemOut(BaseModel):
    item_id: str          # CartItem.id for DB carts; str(product_id) for guest
    product_id: uuid.UUID
    product: ProductOut
    quantity: int
    subtotal: float


class CartOut(BaseModel):
    items: list[CartItemOut]
    total: float
    item_count: int


# ─── Orders ───────────────────────────────────────────────────────────────────

class PlaceOrderIn(BaseModel):
    address_id: uuid.UUID
    discount_code: str | None = None
    notes: str | None = None


class OrderItemOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID | None
    product_name: str
    unit_price: float
    quantity: int
    subtotal: float

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: uuid.UUID
    status: OrderStatus
    subtotal: float
    discount: float
    total: float
    notes: str | None
    placed_at: datetime
    status_updated_at: datetime
    items: list[OrderItemOut] = []

    model_config = {"from_attributes": True}


class OrderSummaryOut(BaseModel):
    id: uuid.UUID
    status: OrderStatus
    total: float
    item_count: int
    placed_at: datetime

    model_config = {"from_attributes": True}


# ─── Wishlist ─────────────────────────────────────────────────────────────────

class WishlistItemOut(BaseModel):
    product_id: uuid.UUID
    product: ProductOut
    created_at: datetime
