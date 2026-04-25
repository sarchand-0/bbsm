from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import auth as auth_router
from app.api.v1 import cart as cart_router
from app.api.v1 import categories as categories_router
from app.api.v1 import orders as orders_router
from app.api.v1 import products as products_router
from app.api.v1 import promotions as promotions_router
from app.api.v1 import account as account_router
from app.api.v1 import wishlists as wishlists_router
from app.api.v1.admin import categories as admin_categories_router
from app.api.v1.admin import dashboard as admin_dashboard_router
from app.api.v1.admin import discounts as admin_discounts_router
from app.api.v1.admin import orders as admin_orders_router
from app.api.v1.admin import products as admin_products_router
from app.api.v1.admin import promotions as admin_promotions_router
from app.api.v1.admin import reports as admin_reports_router
from app.api.v1.admin import users as admin_users_router
from app.api.v1.admin import delivery as admin_delivery_router
from app.api.v1 import rider as rider_router
from app.api.v1 import notifications as notifications_router
from app.api.v1 import discounts as discounts_router
from app.core.config import settings
from app.core.redis import close_redis, get_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_redis()
    yield
    await close_redis()


app = FastAPI(
    title="BBSM API",
    version="1.0.0",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(categories_router.router, prefix="/api/v1")
app.include_router(products_router.router, prefix="/api/v1")
app.include_router(promotions_router.router, prefix="/api/v1")
app.include_router(cart_router.router, prefix="/api/v1")
app.include_router(orders_router.router, prefix="/api/v1")
app.include_router(wishlists_router.router, prefix="/api/v1")
app.include_router(account_router.router, prefix="/api/v1")
app.include_router(admin_dashboard_router.router, prefix="/api/v1")
app.include_router(admin_products_router.router, prefix="/api/v1")
app.include_router(admin_categories_router.router, prefix="/api/v1")
app.include_router(admin_orders_router.router, prefix="/api/v1")
app.include_router(admin_users_router.router, prefix="/api/v1")
app.include_router(admin_promotions_router.router, prefix="/api/v1")
app.include_router(admin_discounts_router.router, prefix="/api/v1")
app.include_router(admin_reports_router.router, prefix="/api/v1")
app.include_router(admin_delivery_router.router, prefix="/api/v1")
app.include_router(rider_router.router, prefix="/api/v1")
app.include_router(notifications_router.router, prefix="/api/v1")
app.include_router(discounts_router.router, prefix="/api/v1")

# Serve uploaded files only when using local storage (not S3)
if not settings.USE_S3:
    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "bbsm-api", "version": "1.0.0"}
