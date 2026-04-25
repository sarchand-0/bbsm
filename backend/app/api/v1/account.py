from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.address import Address
from app.models.user import User

router = APIRouter(prefix="/account", tags=["account"])


class AddressIn(BaseModel):
    label: str = "Home"
    full_address: str
    city: str
    postal_code: str | None = None
    phone: str | None = None
    lat: float | None = None
    lng: float | None = None
    is_default: bool = False


class AddressOut(BaseModel):
    id: UUID
    label: str
    full_address: str
    city: str
    postal_code: str | None
    phone: str | None
    lat: float | None
    lng: float | None
    is_default: bool

    model_config = {"from_attributes": True}


@router.get("/addresses", response_model=list[AddressOut])
async def list_addresses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Address).where(Address.user_id == current_user.id).order_by(Address.is_default.desc())
    )
    return result.scalars().all()


@router.post("/addresses", response_model=AddressOut, status_code=201)
async def create_address(
    body: AddressIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.is_default:
        await db.execute(
            update(Address)
            .where(Address.user_id == current_user.id)
            .values(is_default=False)
        )

    addr = Address(user_id=current_user.id, **body.model_dump())
    db.add(addr)
    await db.commit()
    await db.refresh(addr)
    return addr


@router.delete("/addresses/{address_id}", status_code=204)
async def delete_address(
    address_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == current_user.id)
    )
    addr = result.scalar_one_or_none()
    if addr:
        await db.delete(addr)
        await db.commit()
