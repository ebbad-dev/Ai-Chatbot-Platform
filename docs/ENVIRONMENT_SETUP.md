# Environment Setup

> This document describes environment variables for the AI Chatbot Platform.
> Updated for the revised PRD — Redis is optional, pgvector is not required.

---

## Quick Setup

```bash
# Copy the API environment template
cp apps/api/.env.example apps/api/.env

# Edit with your values (especially DATABASE_PASSWORD in production)
```

---

## API Environment Variables

### Application

| Variable       | Required | Default | Description                                   |
| -------------- | -------- | ------- | --------------------------------------------- |
| `NODE_ENV`     | ✅ Yes   | —       | `development`, `production`, or `test`        |
| `PORT`         | ✅ Yes   | —       | API server port (typically `3000`)            |
| `API_BASE_URL` | ✅ Yes   | —       | Full base URL (e.g., `http://localhost:3000`) |

### Database (PostgreSQL)

| Variable            | Required | Default | Description                                  |
| ------------------- | -------- | ------- | -------------------------------------------- |
| `DATABASE_HOST`     | ✅ Yes   | —       | PostgreSQL host                              |
| `DATABASE_PORT`     | ✅ Yes   | —       | PostgreSQL port (Docker dev: `15432`)        |
| `DATABASE_NAME`     | ✅ Yes   | —       | Database name                                |
| `DATABASE_USER`     | ✅ Yes   | —       | Database user                                |
| `DATABASE_PASSWORD` | ✅ Yes   | —       | Database password (**change in production**) |
| `DATABASE_SSL`      | No       | `false` | Enable SSL connection                        |
| `DATABASE_LOGGING`  | No       | `false` | Enable TypeORM query logging                 |

> [!WARNING]
> Database variables have **no fallback defaults**. If any required variable is missing, the API will fail to start with a clear error message. This prevents accidentally connecting to the wrong database in production.

### Redis (Optional)

Redis is **disabled by default** and not required for the MVP.

| Variable         | Required     | Default | Description                   |
| ---------------- | ------------ | ------- | ----------------------------- |
| `REDIS_ENABLED`  | No           | `false` | Set to `true` to enable Redis |
| `REDIS_HOST`     | When enabled | —       | Redis host                    |
| `REDIS_PORT`     | When enabled | —       | Redis port                    |
| `REDIS_PASSWORD` | No           | `""`    | Redis password                |
| `REDIS_DB`       | No           | `0`     | Redis database number         |

When `REDIS_ENABLED=false`:

- The API starts without connecting to Redis
- The health readiness check reports Redis as `disabled`
- No Redis-related errors occur

To enable Redis:

```bash
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

And start the Redis container:

```bash
docker compose --profile redis up -d
```

### CORS

| Variable       | Required | Default | Description                     |
| -------------- | -------- | ------- | ------------------------------- |
| `CORS_ORIGINS` | No       | `""`    | Comma-separated allowed origins |

### Dashboard Environment

| Variable            | Required | Description                        |
| ------------------- | -------- | ---------------------------------- |
| `VITE_API_BASE_URL` | Yes      | API URL for the dashboard frontend |
| `VITE_APP_NAME`     | No       | Application display name           |

### Widget Environment

| Variable               | Required | Description                             |
| ---------------------- | -------- | --------------------------------------- |
| `VITE_API_BASE_URL`    | Yes      | API URL for the widget frontend         |
| `VITE_WIDGET_BASE_URL` | Yes      | Widget's own URL (for loader reference) |

---

## Docker Compose Services

| Service    | Image                | Port    | Profile | Required |
| ---------- | -------------------- | ------- | ------- | -------- |
| PostgreSQL | `postgres:16-alpine` | `15432` | default | ✅ Yes   |
| Redis      | `redis:7-alpine`     | `6379`  | `redis` | No       |

Start PostgreSQL only (default):

```bash
docker compose up -d
```

Start with Redis:

```bash
docker compose --profile redis up -d
```

---

## pgvector

pgvector is **not required** for the MVP. The platform uses PostgreSQL full-text search (`tsvector` + GIN index) for the initial retrieval layer. Standard PostgreSQL 16 is sufficient.

pgvector may be added in a future phase for semantic search. The Docker image would change from `postgres:16-alpine` to `pgvector/pgvector:pg16`.

## Resetting the Database (Destructive)

If you need to completely reset the local database (for example, after switching from pgvector to standard PostgreSQL, or to clear all data), you can destroy the Docker volume.

> [!CAUTION]
> This will permanently delete all data in the local database.

```bash
docker compose down -v
docker compose up -d
npm run migration:run
```

---

## Validation Behavior

The API validates environment variables at two levels:

1. **Data source initialization** (`data-source.ts`): Database variables are validated immediately when the TypeORM data source is created. Missing variables produce clear error messages.

2. **Config service access** (`AppConfigService`): Other variables are validated on first access using `getRequired()`. Missing required variables throw with the exact variable name.

This ensures the API **fails fast** with actionable error messages rather than silently using incorrect defaults.
