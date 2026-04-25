"""
Integration tests for cart, orders, and wishlist endpoints.
Run: docker compose exec backend pytest tests/test_cart_orders.py -v

Prerequisites: seeded database (run seed.py first).
Uses a fresh customer account per test module (registered once via module-scoped fixture).
"""
import uuid

import httpx
import pytest

BASE = "http://localhost:8000/api/v1"

# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def customer_tokens():
    """Register a throwaway customer and return access token."""
    email = f"cart_test_{uuid.uuid4().hex[:8]}@bbsm.np"
    r = httpx.post(f"{BASE}/auth/register", json={
        "email": email,
        "password": "testpass123",
        "full_name": "Cart Tester",
    })
    assert r.status_code == 201, r.text
    return r.json()["access_token"], r.json()["refresh_token"]


@pytest.fixture(scope="module")
def auth_headers(customer_tokens):
    return {"Authorization": f"Bearer {customer_tokens[0]}"}


@pytest.fixture(scope="module")
def seeded_product_id():
    """Get the first active product's ID from the catalog."""
    r = httpx.get(f"{BASE}/products")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) > 0
    return items[0]["id"]


@pytest.fixture(scope="module")
def seeded_product_slug():
    r = httpx.get(f"{BASE}/products")
    return r.json()["items"][0]["slug"]


# ─── Guest Cart ───────────────────────────────────────────────────────────────

def test_guest_cart_empty():
    r = httpx.get(f"{BASE}/cart")
    assert r.status_code == 200
    data = r.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["item_count"] == 0


def test_guest_cart_add_item(seeded_product_id):
    client = httpx.Client()
    r = client.post(f"{BASE}/cart/items", json={"product_id": seeded_product_id, "quantity": 2})
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 2
    assert data["item_count"] == 2


def test_guest_cart_add_item_accumulates(seeded_product_id):
    """Adding the same product twice accumulates quantity in one session."""
    client = httpx.Client()
    client.post(f"{BASE}/cart/items", json={"product_id": seeded_product_id, "quantity": 1})
    r = client.post(f"{BASE}/cart/items", json={"product_id": seeded_product_id, "quantity": 2})
    assert r.status_code == 200
    data = r.json()
    assert data["items"][0]["quantity"] == 3


def test_guest_cart_update_item(seeded_product_id):
    client = httpx.Client()
    add = client.post(f"{BASE}/cart/items", json={"product_id": seeded_product_id, "quantity": 1})
    item_id = add.json()["items"][0]["item_id"]
    r = client.patch(f"{BASE}/cart/items/{item_id}", json={"quantity": 5})
    assert r.status_code == 200
    assert r.json()["items"][0]["quantity"] == 5


def test_guest_cart_remove_item(seeded_product_id):
    client = httpx.Client()
    add = client.post(f"{BASE}/cart/items", json={"product_id": seeded_product_id, "quantity": 1})
    item_id = add.json()["items"][0]["item_id"]
    r = client.delete(f"{BASE}/cart/items/{item_id}")
    assert r.status_code == 200
    assert r.json()["items"] == []


def test_guest_cart_clear(seeded_product_id):
    client = httpx.Client()
    client.post(f"{BASE}/cart/items", json={"product_id": seeded_product_id, "quantity": 1})
    r = client.delete(f"{BASE}/cart")
    assert r.status_code == 204
    cart = client.get(f"{BASE}/cart")
    assert cart.json()["items"] == []


def test_guest_cart_invalid_product():
    r = httpx.post(f"{BASE}/cart/items", json={"product_id": str(uuid.uuid4()), "quantity": 1})
    assert r.status_code == 404


# ─── Auth Cart ────────────────────────────────────────────────────────────────

def test_auth_cart_empty(auth_headers):
    r = httpx.get(f"{BASE}/cart", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["items"] == []


def test_auth_cart_add_and_get(auth_headers, seeded_product_id):
    httpx.delete(f"{BASE}/cart", headers=auth_headers)  # clear first
    r = httpx.post(f"{BASE}/cart/items", headers=auth_headers,
                   json={"product_id": seeded_product_id, "quantity": 1})
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["product_id"] == seeded_product_id


def test_auth_cart_update(auth_headers, seeded_product_id):
    httpx.delete(f"{BASE}/cart", headers=auth_headers)
    add = httpx.post(f"{BASE}/cart/items", headers=auth_headers,
                     json={"product_id": seeded_product_id, "quantity": 1})
    item_id = add.json()["items"][0]["item_id"]
    r = httpx.patch(f"{BASE}/cart/items/{item_id}", headers=auth_headers,
                    json={"quantity": 3})
    assert r.status_code == 200
    assert r.json()["items"][0]["quantity"] == 3


def test_auth_cart_remove(auth_headers, seeded_product_id):
    httpx.delete(f"{BASE}/cart", headers=auth_headers)
    add = httpx.post(f"{BASE}/cart/items", headers=auth_headers,
                     json={"product_id": seeded_product_id, "quantity": 2})
    item_id = add.json()["items"][0]["item_id"]
    r = httpx.delete(f"{BASE}/cart/items/{item_id}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["items"] == []


# ─── Order Placement ──────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def user_address_id(auth_headers):
    """Add an address for the test customer and return its id."""
    r = httpx.post(f"{BASE}/auth/me", headers=auth_headers)  # just to confirm auth
    # POST /addresses (not yet, so use admin API or seed)
    # Instead we rely on the test registering the address below
    r = httpx.post(
        f"{BASE}/addresses",
        headers=auth_headers,
        json={
            "label": "Home",
            "full_address": "123 Test Street",
            "city": "Kathmandu",
            "postal_code": "44600",
        },
    )
    if r.status_code == 201:
        return r.json()["id"]
    # If address endpoint not yet wired, skip order tests
    pytest.skip("Address endpoint not available yet")


def test_place_order_requires_auth(seeded_product_id):
    r = httpx.post(f"{BASE}/orders", json={
        "address_id": str(uuid.uuid4()),
    })
    assert r.status_code == 403


def test_place_order_empty_cart(auth_headers):
    httpx.delete(f"{BASE}/cart", headers=auth_headers)
    r = httpx.post(f"{BASE}/orders", headers=auth_headers, json={
        "address_id": str(uuid.uuid4()),
    })
    assert r.status_code in (400, 404)


def test_list_my_orders_empty(auth_headers):
    r = httpx.get(f"{BASE}/orders", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_nonexistent_order(auth_headers):
    r = httpx.get(f"{BASE}/orders/{uuid.uuid4()}", headers=auth_headers)
    assert r.status_code == 404


# ─── Wishlist ─────────────────────────────────────────────────────────────────

def test_wishlist_requires_auth(seeded_product_id):
    r = httpx.get(f"{BASE}/wishlist")
    assert r.status_code == 403


def test_wishlist_empty(auth_headers):
    r = httpx.get(f"{BASE}/wishlist", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_wishlist_add(auth_headers, seeded_product_id):
    r = httpx.post(f"{BASE}/wishlist/{seeded_product_id}", headers=auth_headers)
    assert r.status_code in (200, 201)


def test_wishlist_idempotent_add(auth_headers, seeded_product_id):
    """Adding same product twice should not error."""
    httpx.post(f"{BASE}/wishlist/{seeded_product_id}", headers=auth_headers)
    r = httpx.post(f"{BASE}/wishlist/{seeded_product_id}", headers=auth_headers)
    assert r.status_code in (200, 201)


def test_wishlist_get_has_product(auth_headers, seeded_product_id):
    httpx.post(f"{BASE}/wishlist/{seeded_product_id}", headers=auth_headers)
    r = httpx.get(f"{BASE}/wishlist", headers=auth_headers)
    assert r.status_code == 200
    pids = [i["product_id"] for i in r.json()]
    assert seeded_product_id in pids


def test_wishlist_remove(auth_headers, seeded_product_id):
    httpx.post(f"{BASE}/wishlist/{seeded_product_id}", headers=auth_headers)
    r = httpx.delete(f"{BASE}/wishlist/{seeded_product_id}", headers=auth_headers)
    assert r.status_code == 204


def test_wishlist_remove_nonexistent(auth_headers):
    r = httpx.delete(f"{BASE}/wishlist/{uuid.uuid4()}", headers=auth_headers)
    assert r.status_code == 404


def test_wishlist_invalid_product(auth_headers):
    r = httpx.post(f"{BASE}/wishlist/{uuid.uuid4()}", headers=auth_headers)
    assert r.status_code == 404
