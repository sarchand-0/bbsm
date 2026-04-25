# BBSM — E-commerce + CRM

Bhat-Bhateni Super Market online storefront and staff CRM.  
**One command to run everything:**

```bash
cp .env.example .env        # first time only — edit passwords
docker compose up --build
```

## URLs

| Service | URL | Notes |
|---|---|---|
| Storefront | http://localhost | Customer-facing shop |
| Order tracking | http://localhost/track/{orderId} | Live delivery tracking |
| CRM Admin | http://localhost/crm | Staff login required |
| Rider portal | http://localhost/rider | Rider login required |
| FastAPI docs | http://localhost/api/v1/docs | Swagger UI |
| Backend direct | http://localhost:8000 | Dev only |
| Frontend direct | http://localhost:3000 | Dev only |
| PostgreSQL | localhost:5432 | `bbsm_ecommerce` DB |
| Redis | localhost:6379 | |

## Default logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@bbsm.np | admin123 |
| Rider 1 | rider1@bbsm.np | rider123 |
| Rider 2 | rider2@bbsm.np | rider123 |
| Rider 3 | rider3@bbsm.np | rider123 |

> Change all passwords immediately in production.

## Key features

- **Storefront** — browse by category, search products, cart, checkout with discount codes
- **Live delivery tracking** — customer track page with 6-step timeline, rider GPS (polls every 20s)
- **OTP confirmation** — 4-digit code shown on rider's screen, verified by customer on delivery
- **Rider portal** — mobile-friendly dashboard, GPS push, status updates, delivery history
- **CRM** — orders, products, customers, riders, promotions, discounts, reports with CSV export
- **Notifications** — bell icon with unread count, order events trigger automatic notifications

## Dev workflow

```bash
# Start all services
docker compose up

# Start only DB + Redis (run backend/frontend locally)
docker compose up postgres redis

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Run DB migrations
docker compose exec backend alembic upgrade head

# Seed sample data
docker compose exec backend python -m app.scripts.seed

# Stop everything
docker compose down

# Wipe volumes (fresh start)
docker compose down -v
```

## Project structure

```
bbsm/
├── backend/        FastAPI (Python 3.12) — all API logic
├── frontend/       Next.js 14 — storefront (/) + CRM (/crm)
├── nginx/          Reverse proxy config
├── docker-compose.yml
├── .env.example    Copy to .env and fill in secrets
└── README.md
```

## Stack

- **Backend:** FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL 16, Redis 7
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand, TanStack Query
- **Infra:** Docker Compose, Nginx
