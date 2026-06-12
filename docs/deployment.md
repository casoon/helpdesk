# Deployment Guide

## 1. Prerequisites

- Docker ≥ 24 and Docker Compose v2 (`docker compose` — not `docker-compose`)
- A domain name pointed at your server's IP
- (Production) A managed PostgreSQL instance (Supabase, Neon, RDS, etc.) — the compose stack does not include a Postgres container

---

## 2. Clone and configure

```bash
git clone https://github.com/your-org/helpdesk.git
cd helpdesk
cp .env.example .env
```

Edit `.env` and set at minimum:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/helpdesk` |
| `JWT_SECRET` | Yes | Min 32 chars — `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Yes | 64 hex chars — `openssl rand -hex 32` |
| `APP_URL` | Yes | `https://yourdomain.com` |
| `API_URL` | Yes | `https://yourdomain.com` |
| `PUBLIC_API_URL` | Yes | `https://yourdomain.com` |

---

## 3. TLS setup

### Option A — Manual certificate

Place your certificate files at:

```
infra/nginx/ssl/cert.pem
infra/nginx/ssl/key.pem
```

Mount them in `docker-compose.yml` under the `nginx` service:

```yaml
volumes:
  - ./infra/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  - ./infra/nginx/ssl:/etc/nginx/ssl:ro
```

### Option B — Let's Encrypt (certbot)

```bash
certbot certonly --standalone -d yourdomain.com
# Symlink or copy the certs:
mkdir -p infra/nginx/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem infra/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   infra/nginx/ssl/key.pem
```

Add a cron job to renew and reload nginx:

```
0 3 * * * certbot renew --quiet && docker compose -f /path/to/helpdesk/docker-compose.yml exec nginx nginx -s reload
```

---

## 4. First-time setup

```bash
# Build and start all services
docker compose up -d --build

# Run database migrations
docker compose exec api pnpm migrate

# Seed initial data (admin user, default mailbox, etc.)
docker compose exec api pnpm seed
```

---

## 5. Production overrides

For production-specific overrides (resource limits, log drivers, etc.) use a `docker-compose.prod.yml`:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 6. Updating

```bash
git pull
docker compose pull
docker compose up -d --build
# Run any new migrations:
docker compose exec api pnpm migrate
```

---

## 7. Backup and restore

Set the required environment variables, then:

```bash
# Backup (dumps DB, uploads to S3/MinIO)
S3_ACCESS_KEY=... S3_SECRET_KEY=... S3_ENDPOINT=... ./scripts/backup.sh

# Restore a specific backup
BACKUP_FILE=backup_20250601_120000.sql.gz \
  S3_ACCESS_KEY=... S3_SECRET_KEY=... S3_ENDPOINT=... \
  ./scripts/restore.sh
```

See `scripts/backup.sh` and `scripts/restore.sh` for all configurable variables (`S3_BUCKET`, `POSTGRES_USER`, `POSTGRES_DB`).

---

## 8. Health check URLs

| Service | URL |
|---|---|
| API health | `https://yourdomain.com/api/health` |
| MinIO console (dev only) | `http://localhost:9001` |
