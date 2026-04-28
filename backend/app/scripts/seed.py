"""
Seed script — run once to populate the database with initial data.
Usage: docker compose exec backend python -m app.scripts.seed
"""

import asyncio
import uuid

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole, UserStatus
from app.models.category import Category
from app.models.product import Product, ProductStatus
from app.models.promotion import Promotion
from app.models.delivery import Rider

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Seed data ───────────────────────────────────────────────────────────────

ADMIN = {
    "email": "admin@bbsm.np",
    "password": "admin123",
    "full_name": "BBSM Admin",
    "phone": "+977-1-4444444",
    "role": UserRole.admin,
}

CATEGORIES = [
    {"name": "Groceries",      "slug": "groceries",      "icon": "ShoppingBasket", "color_hex": "#E07830", "sort_order": 1},
    {"name": "Fresh Produce",  "slug": "fresh-produce",  "icon": "Leaf",           "color_hex": "#34C759", "sort_order": 2},
    {"name": "Dairy",          "slug": "dairy",          "icon": "Milk",           "color_hex": "#4A7FA0", "sort_order": 3},
    {"name": "Beverages",      "slug": "beverages",      "icon": "Coffee",         "color_hex": "#D4A843", "sort_order": 4},
    {"name": "Snacks",         "slug": "snacks",         "icon": "Cookie",         "color_hex": "#FF9F0A", "sort_order": 5},
    {"name": "Household",      "slug": "household",      "icon": "Home",           "color_hex": "#5E5CE6", "sort_order": 6},
    {"name": "Personal Care",  "slug": "personal-care",  "icon": "Heart",          "color_hex": "#C8102E", "sort_order": 7},
    {"name": "Baby",           "slug": "baby",           "icon": "Baby",           "color_hex": "#7BAFC8", "sort_order": 8},
]

# Verified Pexels photo IDs — fetched directly from Pexels search results
def img(pexels_id: int) -> list[str]:
    return [
        f"https://images.pexels.com/photos/{pexels_id}/pexels-photo-{pexels_id}.jpeg"
        f"?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
    ]

PRODUCTS = [
    # Groceries
    {"name": "Basmati Rice 5kg",        "slug": "basmati-rice-5kg",       "price": 850,  "stock_qty": 200, "cat": "groceries",     "featured": True,  "sku": "GR001", "photo": 7851798},
    {"name": "Mustard Oil 1L",          "slug": "mustard-oil-1l",         "price": 320,  "stock_qty": 150, "cat": "groceries",     "featured": False, "sku": "GR002", "photo": 12284682},
    {"name": "Whole Wheat Flour 5kg",   "slug": "whole-wheat-flour-5kg",  "price": 450,  "stock_qty": 120, "cat": "groceries",     "featured": False, "sku": "GR003", "photo": 11726089},
    {"name": "Lentils (Masoor) 1kg",    "slug": "lentils-masoor-1kg",     "price": 180,  "stock_qty": 180, "cat": "groceries",     "featured": False, "sku": "GR004", "photo": 6086414},
    # Fresh Produce
    {"name": "Tomatoes 1kg",            "slug": "tomatoes-1kg",           "price": 60,   "stock_qty": 300, "cat": "fresh-produce", "featured": True,  "sku": "FP001", "photo": 32873343},
    {"name": "Potatoes 2kg",            "slug": "potatoes-2kg",           "price": 80,   "stock_qty": 250, "cat": "fresh-produce", "featured": False, "sku": "FP002", "photo": 10899606},
    {"name": "Onions 1kg",              "slug": "onions-1kg",             "price": 50,   "stock_qty": 300, "cat": "fresh-produce", "featured": False, "sku": "FP003", "photo": 26859583},
    {"name": "Fresh Spinach 250g",      "slug": "fresh-spinach-250g",     "price": 35,   "stock_qty": 100, "cat": "fresh-produce", "featured": False, "sku": "FP004", "photo": 8954279},
    # Dairy
    {"name": "Full Cream Milk 1L",      "slug": "full-cream-milk-1l",     "price": 95,   "stock_qty": 200, "cat": "dairy",         "featured": True,  "sku": "DA001", "photo": 5946755},
    {"name": "Nepali Ghee 500g",        "slug": "nepali-ghee-500g",       "price": 650,  "stock_qty": 80,  "cat": "dairy",         "featured": True,  "sku": "DA002", "photo": 20689436},
    {"name": "Curd 400g",               "slug": "curd-400g",              "price": 75,   "stock_qty": 120, "cat": "dairy",         "featured": False, "sku": "DA003", "photo": 3547619},
    {"name": "Butter 100g",             "slug": "butter-100g",            "price": 120,  "stock_qty": 90,  "cat": "dairy",         "featured": False, "sku": "DA004", "photo": 94443},
    # Beverages
    {"name": "Nepali Tea 250g",         "slug": "nepali-tea-250g",        "price": 180,  "stock_qty": 200, "cat": "beverages",     "featured": True,  "sku": "BV001", "photo": 16417884},
    {"name": "Mineral Water 1.5L",      "slug": "mineral-water-1-5l",     "price": 40,   "stock_qty": 500, "cat": "beverages",     "featured": False, "sku": "BV002", "photo": 15763942},
    {"name": "Mango Juice 1L",          "slug": "mango-juice-1l",         "price": 120,  "stock_qty": 150, "cat": "beverages",     "featured": False, "sku": "BV003", "photo": 30620864},
    {"name": "Instant Coffee 50g",      "slug": "instant-coffee-50g",     "price": 250,  "stock_qty": 100, "cat": "beverages",     "featured": False, "sku": "BV004", "photo": 35797060},
    # Snacks
    {"name": "Wai Wai Noodles 5-pack",  "slug": "wai-wai-noodles-5pack",  "price": 100,  "stock_qty": 300, "cat": "snacks",        "featured": True,  "sku": "SN001", "photo": 4518673},
    {"name": "Potato Chips 80g",        "slug": "potato-chips-80g",       "price": 60,   "stock_qty": 200, "cat": "snacks",        "featured": False, "sku": "SN002", "photo": 34466116},
    {"name": "Biscuits Assorted 400g",  "slug": "biscuits-assorted-400g", "price": 150,  "stock_qty": 180, "cat": "snacks",        "featured": False, "sku": "SN003", "photo": 7509697},
    # Household
    {"name": "Washing Powder 1kg",      "slug": "washing-powder-1kg",     "price": 200,  "stock_qty": 150, "cat": "household",     "featured": False, "sku": "HH001", "photo": 5591655},
    {"name": "Dish Soap 500ml",         "slug": "dish-soap-500ml",        "price": 120,  "stock_qty": 120, "cat": "household",     "featured": False, "sku": "HH002", "photo": 7492926},
    {"name": "Floor Cleaner 1L",        "slug": "floor-cleaner-1l",       "price": 180,  "stock_qty": 100, "cat": "household",     "featured": True,  "sku": "HH003", "photo": 9462222},
    # Personal Care
    {"name": "Herbal Shampoo 200ml",    "slug": "herbal-shampoo-200ml",   "price": 250,  "stock_qty": 120, "cat": "personal-care", "featured": False, "sku": "PC001", "photo": 35787523},
    {"name": "Neem Soap 100g",          "slug": "neem-soap-100g",         "price": 60,   "stock_qty": 200, "cat": "personal-care", "featured": False, "sku": "PC002", "photo": 6690855},
    {"name": "Toothpaste 150g",         "slug": "toothpaste-150g",        "price": 110,  "stock_qty": 180, "cat": "personal-care", "featured": True,  "sku": "PC003", "photo": 7622555},
    # Baby
    {"name": "Baby Diapers S 30-pack",  "slug": "baby-diapers-s-30pack",  "price": 750,  "stock_qty": 80,  "cat": "baby",          "featured": True,  "sku": "BA001", "photo": 6849268},
    {"name": "Baby Lotion 200ml",       "slug": "baby-lotion-200ml",      "price": 280,  "stock_qty": 100, "cat": "baby",          "featured": False, "sku": "BA002", "photo": 32950999},
    {"name": "Baby Wipes 80-pack",      "slug": "baby-wipes-80pack",      "price": 220,  "stock_qty": 120, "cat": "baby",          "featured": False, "sku": "BA003", "photo": 32386175},
]

PROMOTIONS = [
    {"title": "Dashain Dhamaka Sale",   "sort_order": 1, "link_url": "/products?sale=dashain",         "image_url": "/promo-dashain.jpg"},
    {"title": "Fresh Produce Week",     "sort_order": 2, "link_url": "/categories/fresh-produce",       "image_url": "/promo-fresh-produce.jpg"},
    {"title": "Buy 2 Get 1 Free Dairy", "sort_order": 3, "link_url": "/categories/dairy",               "image_url": "/promo-dairy.jpg"},
]

RIDERS = [
    {"full_name": "Raj Kumar Thapa",   "email": "rider1@bbsm.np", "phone": "+977-9801234567", "vehicle_type": "motorcycle", "license_plate": "BA 1 KA 1234"},
    {"full_name": "Sita Rai",          "email": "rider2@bbsm.np", "phone": "+977-9807654321", "vehicle_type": "bicycle",    "license_plate": None},
    {"full_name": "Bimal Shrestha",    "email": "rider3@bbsm.np", "phone": "+977-9812345678", "vehicle_type": "motorcycle", "license_plate": "BA 2 KA 5678"},
]


# ─── Seeder logic ─────────────────────────────────────────────────────────────

async def seed():
    async with AsyncSessionLocal() as db:
        await seed_admin(db)
        cat_map = await seed_categories(db)
        await seed_products(db, cat_map)
        await seed_promotions(db)
        await seed_riders(db)
        await db.commit()
    print("✓ Seed complete.")


async def seed_admin(db: AsyncSession) -> None:
    existing = await db.scalar(select(User).where(User.email == ADMIN["email"]))
    if existing:
        print("  admin user already exists — skipping")
        return
    user = User(
        id=uuid.uuid4(),
        email=ADMIN["email"],
        password_hash=pwd_ctx.hash(ADMIN["password"]),
        full_name=ADMIN["full_name"],
        phone=ADMIN["phone"],
        role=ADMIN["role"],
        status=UserStatus.active,
    )
    db.add(user)
    print(f"  ✓ admin user: {ADMIN['email']}")


async def seed_categories(db: AsyncSession) -> dict[str, uuid.UUID]:
    cat_map: dict[str, uuid.UUID] = {}
    for c in CATEGORIES:
        existing = await db.scalar(select(Category).where(Category.slug == c["slug"]))
        if existing:
            cat_map[c["slug"]] = existing.id
            continue
        cat = Category(id=uuid.uuid4(), **{k: v for k, v in c.items()})
        db.add(cat)
        cat_map[c["slug"]] = cat.id
    await db.flush()
    print(f"  ✓ {len(CATEGORIES)} categories seeded")
    return cat_map


async def seed_products(db: AsyncSession, cat_map: dict[str, uuid.UUID]) -> None:
    created = updated = 0
    for p in PRODUCTS:
        images = img(p["photo"])
        existing = await db.scalar(select(Product).where(Product.slug == p["slug"]))
        if existing:
            existing.images = images  # refresh photo URLs on every seed run
            updated += 1
            continue
        product = Product(
            id=uuid.uuid4(),
            name=p["name"],
            slug=p["slug"],
            price=p["price"],
            stock_qty=p["stock_qty"],
            category_id=cat_map.get(p["cat"]),
            status=ProductStatus.active,
            is_featured=p["featured"],
            sku=p["sku"],
            images=images,
            description=f"Quality {p['name']} from BBSM Supermarket.",
        )
        db.add(product)
        created += 1
    await db.flush()
    print(f"  ✓ {created} products created, {updated} image URLs refreshed")


async def seed_promotions(db: AsyncSession) -> None:
    count = 0
    for pr in PROMOTIONS:
        existing = await db.scalar(select(Promotion).where(Promotion.title == pr["title"]))
        if existing:
            # Refresh image_url on re-run so fixes propagate
            existing.image_url = pr.get("image_url")
            count += 1
            continue
        promo = Promotion(
            id=uuid.uuid4(),
            title=pr["title"],
            sort_order=pr["sort_order"],
            link_url=pr.get("link_url"),
            image_url=pr.get("image_url"),
            active=True,
        )
        db.add(promo)
        count += 1
    await db.flush()
    print(f"  ✓ {count} promotions seeded/updated")


async def seed_riders(db: AsyncSession) -> None:
    count = 0
    for r in RIDERS:
        existing = await db.scalar(select(User).where(User.email == r["email"]))
        if existing:
            continue
        user = User(
            id=uuid.uuid4(),
            email=r["email"],
            password_hash=pwd_ctx.hash("rider123"),
            full_name=r["full_name"],
            phone=r["phone"],
            role=UserRole.rider,
            status=UserStatus.active,
        )
        db.add(user)
        await db.flush()
        rider = Rider(
            id=uuid.uuid4(),
            user_id=user.id,
            vehicle_type=r["vehicle_type"],
            license_plate=r["license_plate"],
            is_available=True,
            is_active=True,
        )
        db.add(rider)
        count += 1
    await db.flush()
    if count:
        print(f"  ✓ {count} riders seeded (password: rider123)")


if __name__ == "__main__":
    asyncio.run(seed())
