import hashlib
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    token_ttl_seconds,
    verify_password,
)
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import LoginIn, LogoutIn, RefreshIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _blocklist_key(token: str) -> str:
    return "token:blocklist:" + hashlib.sha256(token.encode()).hexdigest()


def _make_token_response(user: User) -> TokenOut:
    user_id = str(user.id)
    return TokenOut(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        role=UserRole.customer,
        status=UserStatus.active,
    )
    db.add(user)
    await db.flush()
    return _make_token_response(user)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user.status == UserStatus.suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return _make_token_response(user)


@router.post("/refresh", response_model=TokenOut)
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise exc
    except JWTError:
        raise exc

    # Check blocklist — best-effort, skip if Redis unavailable
    try:
        redis = await get_redis()
        if await redis.exists(_blocklist_key(body.refresh_token)):
            raise exc
    except HTTPException:
        raise
    except Exception:
        pass  # Redis down — skip blocklist check

    user = await db.get(User, payload["sub"])
    if not user or user.status == UserStatus.suspended:
        raise exc

    # Blocklist the old token — best-effort, skip if Redis unavailable
    try:
        redis = await get_redis()
        ttl = token_ttl_seconds(payload)
        if ttl > 0:
            await redis.setex(_blocklist_key(body.refresh_token), ttl, "1")
    except Exception:
        pass

    return _make_token_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: LogoutIn, redis=Depends(get_redis)):
    try:
        payload = decode_token(body.refresh_token)
        ttl = token_ttl_seconds(payload)
        if ttl > 0:
            await redis.setex(_blocklist_key(body.refresh_token), ttl, "1")
    except JWTError:
        pass  # already invalid — nothing to blocklist


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
