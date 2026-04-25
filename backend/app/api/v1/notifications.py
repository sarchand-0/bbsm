import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, update, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.delivery import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    body: str
    data: dict
    read: bool
    created_at: str
    model_config = {"from_attributes": True}

    def model_post_init(self, _):
        if hasattr(self, 'created_at') and not isinstance(self.created_at, str):
            object.__setattr__(self, 'created_at', self.created_at.isoformat() if self.created_at else "")


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    limit: int = 30,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifs = rows.scalars().all()
    return [
        NotificationOut(
            id=n.id,
            type=n.type,
            title=n.title,
            body=n.body,
            data=n.data,
            read=n.read,
            created_at=n.created_at.isoformat(),
        )
        for n in notifs
    ]


@router.get("/unread-count")
async def unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await db.scalar(
        select(sqlfunc.count(Notification.id))
        .where(Notification.user_id == user.id, Notification.read.is_(False))
    )
    return {"count": count or 0}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user.id)
        .values(read=True)
    )
    await db.commit()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read.is_(False))
        .values(read=True)
    )
    await db.commit()
    return {"ok": True}
