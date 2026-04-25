import uuid
from datetime import datetime

from pydantic import BaseModel, computed_field, model_validator

from app.models.product import ProductStatus


# ─── Category ─────────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    icon: str | None
    color_hex: str | None
    sort_order: int
    parent_id: uuid.UUID | None

    model_config = {"from_attributes": True}


class CategoryTreeOut(CategoryOut):
    children: list["CategoryTreeOut"] = []


# ─── Product ──────────────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    price: float
    stock_qty: int
    status: ProductStatus
    is_featured: bool
    images: list[str]
    category_id: uuid.UUID | None
    category: CategoryOut | None = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def coerce_price(cls, data):
        # Decimal → float when coming from SQLAlchemy
        if hasattr(data, "price"):
            object.__setattr__(data, "price", float(data.price))
        return data


class ProductDetailOut(ProductOut):
    description: str | None
    sku: str | None
    created_at: datetime
    updated_at: datetime


# ─── Pagination ───────────────────────────────────────────────────────────────

class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class ProductListOut(BaseModel):
    items: list[ProductOut]
    meta: PaginationMeta


# ─── Promotion ────────────────────────────────────────────────────────────────

class PromotionOut(BaseModel):
    id: uuid.UUID
    title: str
    image_url: str | None
    link_url: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    active: bool
    sort_order: int

    model_config = {"from_attributes": True}
