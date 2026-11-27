# Project Phoenix / PhoenixCart

An isolated learning application for DevOps, DevSecOps and SRE. All orders and products are synthetic; there are no payment integrations or personal data.

## Components
- React storefront using Vite; requests go to the backend through a development proxy.
- Node.js / Express REST API.
- PostgreSQL schema in `app/backend/db/init.sql`; optional Redis catalog cache.
- Prometheus-compatible metrics, JSON request logs, request IDs, separate liveness/readiness endpoints.
- Automated backend tests. Infrastructure and CI/CD are intentionally left for the DevOps exercises.

## Local smoke test (Node.js 22+)
From repository root, terminal 1:

```bash
cd app/backend
npm ci
npm test
npm start
```

Terminal 2:

```bash
cd app/frontend
npm ci
npm run dev
```

Open http://localhost:5173. The default API mode is an ephemeral in-memory demonstration (not production persistence).

```bash
curl -i http://localhost:3000/healthz
curl -i http://localhost:3000/readyz
curl http://localhost:3000/api/products
curl http://localhost:3000/metrics
```

## Configuration
`PORT` (3000), `HOST` (127.0.0.1; set to 0.0.0.0 for containers), `STORE_MODE` (memory/postgres), `DATABASE_URL` (required for postgres), and optional `REDIS_URL`. Use protected environment injection; never commit actual secrets. Apply the SQL schema before switching to postgres mode. Redis is an optional catalog cache; a cache outage falls back to the primary store. The database is a required dependency in postgres mode. Configure the production ingress/gateway to route `/api` to the backend and keep metrics/internal health endpoints private.

This release does not include Docker, Jenkins, Terraform, Kubernetes manifests, production ingress, deployment automation, load tests, tracing, or dashboards. These are subsequent learning steps. The app is not a production commerce product; no stock reservation or real payment processing.
