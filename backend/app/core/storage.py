"""File storage abstraction — local disk in dev, AWS S3 in production."""
from pathlib import Path

from app.core.config import settings


async def save_upload(file_bytes: bytes, key: str, content_type: str) -> str:
    """Save bytes to storage and return the public URL."""
    if settings.USE_S3:
        return _save_s3(file_bytes, key, content_type)
    return _save_local(file_bytes, key)


def _save_s3(file_bytes: bytes, key: str, content_type: str) -> str:
    import boto3

    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION,
    )
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}"


def _save_local(file_bytes: bytes, key: str) -> str:
    dest = Path(settings.UPLOAD_DIR) / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(file_bytes)
    return f"/uploads/{key}"
