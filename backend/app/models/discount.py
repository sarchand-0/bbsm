import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DiscountType(str, enum.Enum):
    percent = "percent"
    fixed = "fixed"


class DiscountCode(Base):
    __tablename__ = "discount_codes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    type: Mapped[DiscountType] = mapped_column(
        Enum(DiscountType, name="discounttype"), nullable=False
    )
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    usage_limit: Mapped[int | None] = mapped_column(Integer)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    starts_at: Mapped[datetime | None]
    expires_at: Mapped[datetime | None]
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), server_default=func.now())
