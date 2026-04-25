"""
Integration tests for catalog endpoints (categories, products, promotions).
Run: docker compose exec backend pytest tests/test_catalog.py -v
"""

import httpx

BASE = "http://localhost:8000/api/v1"


# ─── Categories ───────────────────────────────────────────────────────────────

def test_categories_returns_list():
    r = httpx.get(f"{BASE}/categories")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 8


def test_categories_tree_has_required_fields():
    data = httpx.get(f"{BASE}/categories").json()
    first = data[0]
    for field in ("id", "name", "slug", "sort_order", "children"):
        assert field in first, f"missing field: {field}"


def test_categories_sorted_by_sort_order():
    data = httpx.get(f"{BASE}/categories").json()
    orders = [c["sort_order"] for c in data]
    assert orders == sorted(orders)


def test_category_by_slug_happy():
    r = httpx.get(f"{BASE}/categories/groceries")
    assert r.status_code == 200
    assert r.json()["slug"] == "groceries"


def test_category_by_slug_not_found():
    r = httpx.get(f"{BASE}/categories/does-not-exist")
    assert r.status_code == 404


# ─── Products — list & filters ────────────────────────────────────────────────

def test_products_list_returns_pagination():
    r = httpx.get(f"{BASE}/products")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "meta" in data
    meta = data["meta"]
    for field in ("page", "per_page", "total", "total_pages"):
        assert field in meta
    assert meta["total"] == 28
    assert meta["page"] == 1


def test_products_list_items_have_category():
    items = httpx.get(f"{BASE}/products").json()["items"]
    assert len(items) > 0
    first = items[0]
    for field in ("id", "name", "slug", "price", "stock_qty", "images"):
        assert field in first, f"missing field: {field}"
    # category must be nested (not None for seeded products)
    assert first["category"] is not None
    assert "slug" in first["category"]


def test_products_filter_by_category():
    r = httpx.get(f"{BASE}/products", params={"category": "dairy"})
    assert r.status_code == 200
    data = r.json()
    assert data["meta"]["total"] == 4
    for item in data["items"]:
        assert item["category"]["slug"] == "dairy"


def test_products_filter_unknown_category_404():
    r = httpx.get(f"{BASE}/products", params={"category": "nonexistent"})
    assert r.status_code == 404


def test_products_search_by_name():
    r = httpx.get(f"{BASE}/products", params={"search": "milk"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) >= 1
    assert any("milk" in item["name"].lower() for item in items)


def test_products_search_no_results():
    r = httpx.get(f"{BASE}/products", params={"search": "xyznonexistentproduct"})
    assert r.status_code == 200
    assert r.json()["meta"]["total"] == 0


def test_products_filter_by_price_range():
    r = httpx.get(f"{BASE}/products", params={"min_price": 500, "max_price": 900})
    assert r.status_code == 200
    for item in r.json()["items"]:
        assert 500 <= item["price"] <= 900


def test_products_sort_price_asc():
    r = httpx.get(f"{BASE}/products", params={"sort": "price_asc", "per_page": 5})
    items = r.json()["items"]
    prices = [i["price"] for i in items]
    assert prices == sorted(prices)


def test_products_sort_price_desc():
    r = httpx.get(f"{BASE}/products", params={"sort": "price_desc", "per_page": 5})
    items = r.json()["items"]
    prices = [i["price"] for i in items]
    assert prices == sorted(prices, reverse=True)


def test_products_filter_featured():
    r = httpx.get(f"{BASE}/products", params={"featured": "true"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    assert all(i["is_featured"] for i in items)


def test_products_pagination():
    page1 = httpx.get(f"{BASE}/products", params={"page": 1, "per_page": 5}).json()
    page2 = httpx.get(f"{BASE}/products", params={"page": 2, "per_page": 5}).json()
    slugs1 = {i["slug"] for i in page1["items"]}
    slugs2 = {i["slug"] for i in page2["items"]}
    # Pages must not overlap
    assert slugs1.isdisjoint(slugs2)
    assert page1["meta"]["total_pages"] == page2["meta"]["total_pages"]


def test_products_pagination_meta_total_pages():
    r = httpx.get(f"{BASE}/products", params={"per_page": 10}).json()
    meta = r["meta"]
    import math
    assert meta["total_pages"] == math.ceil(meta["total"] / meta["per_page"])


def test_products_invalid_sort_returns_422():
    r = httpx.get(f"{BASE}/products", params={"sort": "invalid_sort"})
    assert r.status_code == 422


# ─── Products — featured & detail ─────────────────────────────────────────────

def test_featured_products():
    r = httpx.get(f"{BASE}/products/featured")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) > 0
    assert all(i["is_featured"] for i in items)


def test_featured_products_limit():
    r = httpx.get(f"{BASE}/products/featured", params={"limit": 3})
    assert r.status_code == 200
    assert len(r.json()) <= 3


def test_product_detail_happy():
    r = httpx.get(f"{BASE}/products/basmati-rice-5kg")
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == "basmati-rice-5kg"
    assert data["name"] == "Basmati Rice 5kg"
    assert "description" in data
    assert "sku" in data
    assert "created_at" in data
    assert data["category"]["slug"] == "groceries"


def test_product_detail_not_found():
    r = httpx.get(f"{BASE}/products/does-not-exist")
    assert r.status_code == 404


def test_product_detail_price_is_float():
    r = httpx.get(f"{BASE}/products/basmati-rice-5kg")
    assert isinstance(r.json()["price"], float)


# ─── Promotions ───────────────────────────────────────────────────────────────

def test_promotions_list():
    r = httpx.get(f"{BASE}/promotions")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 3  # seeded 3 promotions


def test_promotions_have_required_fields():
    data = httpx.get(f"{BASE}/promotions").json()
    for promo in data:
        for field in ("id", "title", "active", "sort_order"):
            assert field in promo
        assert promo["active"] is True


def test_promotions_sorted_by_sort_order():
    data = httpx.get(f"{BASE}/promotions").json()
    orders = [p["sort_order"] for p in data]
    assert orders == sorted(orders)
