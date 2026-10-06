# Production Deployment Guide

## Deployment Targets

The platform is designed to be fully containerized or run directly on Node.js 22 LTS / Google Cloud Run / standard Linux VMs.

---

## 1. Prerequisites
- Node.js 22.x or higher
- npm 10.x or higher
- Linux / macOS / Docker environment

---

## 2. Environment Configuration
Copy `.env.example` to `.env` and provide environment-specific values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Listening port for the application server | `3000` |
| `NODE_ENV` | Runtime environment (`production` or `development`) | `production` |
| `GEMINI_API_KEY` | Server-side Gemini API key for quantitative analysis | `""` |
| `JWT_SECRET` | 32+ character HMAC-SHA256 signature secret for tokens | Required in prod |
| `DATABASE_FILE_PATH` | Path to persistent database JSON file | `data/trading_database.json` |
| `APP_URL` | Public application domain URL for CORS validation | `http://localhost:3000` |

---

## 3. Clean Build & Startup Commands

```bash
# 1. Clean installation of production dependencies
npm ci

# 2. Type verification & linting
npm run lint

# 3. Comprehensive test suite execution (130+ unit & calculation tests)
npm test

# 4. Production frontend build
npm run build

# 5. Production server start
npm start
```

---

## 4. Google Cloud Run Deployment

The application is fully compatible with Google Cloud Run:
- Reads the dynamic `PORT` environment variable injected by Cloud Run.
- Binds to `0.0.0.0`.
- Provides `/health` and `/ready` probes for automated traffic splitting and container health checks.

```bash
gcloud run deploy astrology-bitcoin-analysis \
  --source . \
  --region europe-west2 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

---

## 5. Health & Readiness Verification

```bash
# Liveness Check
curl -i http://localhost:3000/health

# Readiness Check
curl -i http://localhost:3000/ready
```

Expected response for `/health`:
```json
{
  "status": "UP",
  "uptimeSeconds": 12,
  "environment": "production",
  "version": "1.2.0",
  "checks": { "server": "OK", "database": "OK", "broker": "OK" }
}
```

---

## 6. Rollback Procedures

If an operational anomaly or regression occurs during rollout:

1. **Stop Rollout Immediately**:
   - In Cloud Run: Revert traffic split to the previous stable revision.
   ```bash
   gcloud run services update-traffic astrology-bitcoin-analysis --to-revisions PREVIOUS_REVISION=100
   ```
2. **Database State Verification**:
   - Restore database from the latest verified snapshot via `POST /api/admin/restore`.
3. **Verify Health**:
   - Query `GET /health` and `GET /ready` to verify clean restoration.
