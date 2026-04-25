"""Shared helper to create in-app notifications."""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.delivery import Notification


async def create_notification(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    type: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        data=data or {},
    )
    db.add(notif)
    # caller is responsible for commit
