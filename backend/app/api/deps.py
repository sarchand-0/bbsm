import hashlib

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import decode_token
from app.models.user import User, UserRole, UserStatus

bearer = HTTPBearer()
bearer_optional = HTTPBearer(auto_error=False)


def _blocklist_key(token: str) -> str:
    return "token:blocklist:" + hashlib.sha256(token.encode()).hexdigest()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> User:
    token = credentials.credentials
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise exc
        user_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise exc

    user = await db.get(User, user_id)
    if not user:
        raise exc
    if user.status == UserStatus.suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return user


async def optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Returns User if a valid Bearer token is present, else None (no error)."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        user = await db.get(User, payload["sub"])
        return user if user and user.status == UserStatus.active else None
    except (JWTError, KeyError):
        return None


def require_role(*roles: UserRole):
    """Factory — returns a dependency that enforces one of the given roles."""
    async def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return _dep
