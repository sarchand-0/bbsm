from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL — set DATABASE_URL directly (Railway/Render/RDS) OR individual parts (Docker Compose)
    DATABASE_URL: str = ""
    POSTGRES_USER: str = "bbsm"
    POSTGRES_PASSWORD: str = "bbsmpassword"
    POSTGRES_DB: str = "bbsm_ecommerce"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432

    # Redis — supports rediss:// (Upstash TLS) and redis:// (local)
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET: str = "change-this-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — comma-separated list of allowed origins
    BACKEND_CORS_ORIGINS: str = "http://localhost,http://localhost:3000"

    # File storage — set USE_S3=true in production
    USE_S3: bool = False
    UPLOAD_DIR: str = "/tmp/uploads"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_S3_REGION: str = "ap-south-1"

    # Currency exchange rates (NPR)
    EXCHANGE_RATE_USD_NPR: float = 135.0
    EXCHANGE_RATE_INR_NPR: float = 1.60

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",")]

    @property
    def db_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and "+asyncpg" not in url:
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            # Auto-add SSL for RDS endpoints
            if "rds.amazonaws.com" in url and "ssl" not in url:
                url += "?ssl=require"
            return url
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = {"env_file": ".env", "case_sensitive": True, "extra": "ignore"}


settings = Settings()
