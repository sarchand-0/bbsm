from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL
    POSTGRES_USER: str = "bbsm"
    POSTGRES_PASSWORD: str = "bbsmpassword"
    POSTGRES_DB: str = "bbsm_ecommerce"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET: str = "change-this-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS — stored as comma-separated string; use the property for a list
    BACKEND_CORS_ORIGINS: str = "http://localhost,http://localhost:3000"

    # Uploads
    UPLOAD_DIR: str = "/app/uploads"

    # Currency exchange rates (NPR)
    EXCHANGE_RATE_USD_NPR: float = 135.0
    EXCHANGE_RATE_INR_NPR: float = 1.60

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",")]

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = {"env_file": ".env", "case_sensitive": True, "extra": "ignore"}


settings = Settings()
