"""
Integration tests for /api/v1/auth/* endpoints.
Run against the live Docker stack: docker compose exec backend pytest tests/test_auth.py -v
"""

import uuid
import pytest
import httpx

BASE = "http://localhost:8000/api/v1"

# Use a unique email per test run so reruns don't conflict
RUN_ID = str(uuid.uuid4())[:8]
TEST_EMAIL = f"testuser_{RUN_ID}@bbsm.np"
TEST_PASS = "testpass123"
TEST_NAME = "Test User"


# ─── helpers ──────────────────────────────────────────────────────────────────

def register(email=TEST_EMAIL, password=TEST_PASS, full_name=TEST_NAME):
    return httpx.post(f"{BASE}/auth/register", json={"email": email, "password": password, "full_name": full_name})

def login(email=TEST_EMAIL, password=TEST_PASS):
    return httpx.post(f"{BASE}/auth/login", json={"email": email, "password": password})

def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── register ─────────────────────────────────────────────────────────────────

def test_register_happy():
    r = register()
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == TEST_EMAIL
    assert data["user"]["role"] == "customer"


def test_register_duplicate_email():
    r = register()  # second call with same email
    assert r.status_code == 409
    assert "already registered" in r.json()["detail"]


def test_register_weak_password():
    r = register(email=f"weak_{RUN_ID}@bbsm.np", password="12")
    assert r.status_code == 422


# ─── login ────────────────────────────────────────────────────────────────────

def test_login_happy():
    r = login()
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == TEST_EMAIL


def test_login_wrong_password():
    r = login(password="wrongpassword")
    assert r.status_code == 401
    assert "Invalid" in r.json()["detail"]


def test_login_unknown_email():
    r = login(email="nobody@bbsm.np")
    assert r.status_code == 401


# ─── me ───────────────────────────────────────────────────────────────────────

def test_me_happy():
    tokens = login().json()
    r = httpx.get(f"{BASE}/auth/me", headers=auth_header(tokens["access_token"]))
    assert r.status_code == 200
    assert r.json()["email"] == TEST_EMAIL


def test_me_no_token():
    r = httpx.get(f"{BASE}/auth/me")
    assert r.status_code == 403  # HTTPBearer returns 403 when header missing


def test_me_invalid_token():
    r = httpx.get(f"{BASE}/auth/me", headers=auth_header("not.a.real.token"))
    assert r.status_code == 401


# ─── refresh ──────────────────────────────────────────────────────────────────

def test_refresh_happy():
    tokens = login().json()
    r = httpx.post(f"{BASE}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    # new access token should work for /me
    me = httpx.get(f"{BASE}/auth/me", headers=auth_header(data["access_token"]))
    assert me.status_code == 200


def test_refresh_with_access_token_fails():
    tokens = login().json()
    r = httpx.post(f"{BASE}/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert r.status_code == 401


def test_refresh_invalid_token():
    r = httpx.post(f"{BASE}/auth/refresh", json={"refresh_token": "garbage.token.here"})
    assert r.status_code == 401


# ─── logout ───────────────────────────────────────────────────────────────────

def test_logout_blocks_refresh():
    tokens = login().json()
    refresh_token = tokens["refresh_token"]

    # logout
    r = httpx.post(f"{BASE}/auth/logout", json={"refresh_token": refresh_token})
    assert r.status_code == 204

    # try to use the blocklisted refresh token
    r2 = httpx.post(f"{BASE}/auth/refresh", json={"refresh_token": refresh_token})
    assert r2.status_code == 401


def test_logout_with_invalid_token_is_silent():
    # Logout with a garbage token should not raise an error
    r = httpx.post(f"{BASE}/auth/logout", json={"refresh_token": "totally.invalid.token"})
    assert r.status_code == 204
