# @casoon/helpdesk

> **Early development — not production-ready.**
> The API, schema, and UI are subject to breaking changes without notice.
> We welcome issues and pull requests, but please expect rough edges.

A self-hosted, open-source helpdesk built for teams who want full control over their support infrastructure. Built from scratch with a modern TypeScript stack.

---

## What it is

A shared inbox and ticket system deployable via a single `docker compose up`. Email arrives via IMAP, agents reply through a web UI, everything is stored in your own PostgreSQL database and S3-compatible object storage.

## Status

| Area | State |
|---|---|
| Database schema | ✅ stable enough to build on |
| Hono API | 🔨 basic CRUD, auth working |
| IMAP worker | 🔨 polling + parsing implemented |
| Mailer worker | 🔨 queue-based sending |
| Web UI | 🚧 login + conversation list only |
| Attachments | 🚧 inbound works, upload UI missing |
| Search / Tags | ❌ not started |
| Realtime (SSE) | ❌ not started |

## Tech stack

- **Frontend** — Astro 5, Svelte 5, Tailwind 4
- **API** — Hono on Node.js
- **Workers** — pg-boss (PostgreSQL-native queue)
- **Database** — Drizzle ORM + PostgreSQL (Supabase-compatible)
- **Storage** — S3-compatible (Cloudflare R2, AWS S3, MinIO for local dev)
- **Deployment** — Docker Compose + Nginx

## Quick start (local dev)

```bash
cp .env.example .env
# Edit .env — DATABASE_URL is the only required change for local dev
# (MinIO runs inside Docker; no external accounts needed)

docker compose up
```

MinIO console: [http://localhost:9001](http://localhost:9001) — `minioadmin / minioadmin`

**First user:**
```bash
SEED_ADMIN_EMAIL=you@example.com \
SEED_ADMIN_PASSWORD=changeme \
pnpm --filter=@casoon/helpdesk-api seed
```

## Development

```bash
pnpm install
pnpm dev           # starts all apps in watch mode via Turborepo
```

Database migrations:
```bash
pnpm db:generate   # generate SQL from schema changes
pnpm db:migrate    # apply migrations
pnpm db:studio     # open Drizzle Studio
```

## Deployment

Point a VPS at this repo, copy `.env.example` to `.env`, fill in your managed PostgreSQL URL and S3 credentials, then:

```bash
docker compose -f docker-compose.yml up -d
```

For TLS, mount certificates into `infra/nginx/certs/` and update `infra/nginx/nginx.conf`.

## License

AGPL-3.0-only — see [LICENSE](LICENSE).
