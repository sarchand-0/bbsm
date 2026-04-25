import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.discount import DiscountType
from app.models.order import OrderStatus
from app.models.product import ProductStatus
from app.models.user import UserRole, UserStatus
from app.schemas.catalog import CategoryOut


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStatsOut(BaseModel):
    today_orders: int
    today_revenue: float
    new_users_7d: int
    low_stock_count: int


class RevenueDataPoint(BaseModel):
    date: str
    revenue: float
    orders: int


# ─── Products ─────────────────────────────────────────────────────────────────

class AdminProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: float = Field(gt=0)
    stock_qty: int = Field(ge=0)
    category_id: uuid.UUID | None = None
    status: ProductStatus = ProductStatus.active
    is_featured: bool = False
    sku: str | None = None
    images: list[str] = []


class AdminProductUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    stock_qty: int | None = Field(default=None, ge=0)
    category_id: uuid.UUID | None = None
    status: ProductStatus | None = None
    is_featured: bool | None = None
    sku: str | None = None
    images: list[str] | None = None


class AdminProductOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    price: float
    stock_qty: int
    category_id: uuid.UUID | None
    category: CategoryOut | None = None
    status: ProductStatus
    is_featured: bool
    sku: str | None
    images: list
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _coerce(self) -> "AdminProductOut":
        if self.price is not None:
            self.price = float(self.price)
        return self


# ─── Categories ───────────────────────────────────────────────────────────────

class AdminCategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str | None = None
    icon: str | None = None
    color_hex: str | None = None
    sort_order: int = 0
    parent_id: uuid.UUID | None = None


class AdminCategoryUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = None
    icon: str | None = None
    color_hex: str | None = None
    sort_order: int | None = None
    parent_id: uuid.UUID | None = None


class AdminCategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    icon: str | None
    color_hex: str | None
    sort_order: int
    parent_id: uuid.UUID | None

    model_config = {"from_attributes": True}


class CategoryReorderIn(BaseModel):
    ids: list[uuid.UUID]


# ─── Orders ───────────────────────────────────────────────────────────────────

class AdminOrderCustomer(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None

    model_config = {"from_attributes": True}


class AdminOrderItemOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID | None
    product_name: str
    unit_price: float
    quantity: int
    subtotal: float

    model_config = {"from_attributes": True}


class AdminOrderOut(BaseModel):
    id: uuid.UUID
    status: OrderStatus
    subtotal: float
    discount: float
    total: float
    notes: str | None
    placed_at: datetime
    status_updated_at: datetime
    customer: AdminOrderCustomer | None = None
    items: list[AdminOrderItemOut] = []

    model_config = {"from_attributes": True}


class AdminOrderSummaryOut(BaseModel):
    id: uuid.UUID
    status: OrderStatus
    total: float
    item_count: int
    placed_at: datetime
    customer_name: str
    customer_email: str


class OrderStatusUpdateIn(BaseModel):
    status: OrderStatus


# ─── Users ────────────────────────────────────────────────────────────────────

class AdminUserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None
    role: UserRole
    status: UserStatus
    created_at: datetime
    order_count: int = 0
    lifetime_value: float = 0.0

    model_config = {"from_attributes": True}


class UserStatusUpdateIn(BaseModel):
    status: UserStatus


class UserRoleUpdateIn(BaseModel):
    role: UserRole


# ─── Promotions ───────────────────────────────────────────────────────────────

class AdminPromotionIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    image_url: str | None = None
    link_url: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    active: bool = True
    sort_order: int = 0


class AdminPromotionUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    image_url: str | None = None
    link_url: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    active: bool | None = None
    sort_order: int | None = None


class AdminPromotionOut(BaseModel):
    id: uuid.UUID
    title: str
    image_url: str | None
    link_url: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    active: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Discount Codes ───────────────────────────────────────────────────────────

class AdminDiscountCodeIn(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    type: DiscountType
    value: float = Field(gt=0)
    usage_limit: int | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    active: bool = True


class AdminDiscountCodeUpdateIn(BaseModel):
    type: DiscountType | None = None
    value: float | None = Field(default=None, gt=0)
    usage_limit: int | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    active: bool | None = None


class AdminDiscountCodeOut(BaseModel):
    id: uuid.UUID
    code: str
    type: DiscountType
    value: float
    usage_limit: int | None
    used_count: int
    starts_at: datetime | None
    expires_at: datetime | None
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Reports ──────────────────────────────────────────────────────────────────

class SalesReportOut(BaseModel):
    from_date: str
    to_date: str
    total_orders: int
    total_revenue: float
    total_discount: float
    net_revenue: float
    data: list[RevenueDataPoint]


class TopProductOut(BaseModel):
    product_id: uuid.UUID | None
    product_name: str
    total_sold: int
    total_revenue: float


class TopCustomerOut(BaseModel):
    user_id: uuid.UUID
    email: str
    full_name: str
    order_count: int
    lifetime_value: float
