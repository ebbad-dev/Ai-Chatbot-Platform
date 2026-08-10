# AI Website Assistant Platform (Text & Voice Ready)

A hosted, universal, website-embeddable AI assistant platform designed for e-commerce brands (OpenCart, PrintEZ, Shopify, WooCommerce) and general websites. Visitors receive instantaneous AI-generated answers grounded strictly in relational product catalogs, verified FAQs, real-time stateless order checkups, and website documentation.

> **Status:** Production Ready (Phase D Architecture Architecture Completed & Verified). See [docs/PHASE_D_REPORT.md](docs/PHASE_D_REPORT.md) for complete engineering details and benchmarks.

---

## How It Works

1. **Universal Connectors:** Store products ($6,000+$ items with categories, pricing, shipping tiers, and discounts) are automatically synced from merchant APIs directly into structured **PostgreSQL relational tables** via asynchronous **BullMQ / Redis** background workers.
2. **Intelligent Web Crawling:** The crawler indexes documentation, blog posts, and store policies while automatically excluding e-commerce product and category URLs to prevent duplication.
3. **Stateless Live Order Lookup:** Order tracking inquiries are proxied in real time from merchant systems and **never stored or cached in our database**, guaranteeing total consumer data compliance.
4. **Lightweight JavaScript Widget:** Clients add a single `<script>` snippet to their website. The client does **not** install Node.js, Docker, Redis, or PostgreSQL. Everything runs on our NestJS backend cloud infrastructure.
5. **Continuous Optimization:** Unanswered customer queries are tracked in real-time, allowing store owners to transform conversational gaps directly into active FAQs.

---

## Repository Structure

This repository is an npm workspaces monorepo:

```
ai-chatbot-platform/
├── apps/
│   ├── api/          # NestJS backend API Gateway & BullMQ processing engine
│   ├── dashboard/    # React internal management dashboard (Vite + Tailored UI)
│   └── widget/       # React chatbot embed widget for iframe (Vite + Dynamic Animations)
├── packages/
│   ├── shared-types/    # Unified TypeScript interfaces, intents, enums, and payloads
│   ├── shared-config/   # Shared ESLint/TS/Prettier enterprise configuration
│   └── widget-loader/   # Lightweight Vanilla TS loader script for client embedding
├── docs/             # Technical architectural reports and specifications
└── docker-compose.yml
```

---

## Prerequisites & Technology Stack

- **Node.js:** v20 LTS or later
- **Package Manager:** npm v9+
- **Databases:** PostgreSQL 16+ (with `pg_trgm` extension enabled) & Redis 7+ (required for BullMQ queue processing)
- **Search Architecture:** Hybrid PostgreSQL indexing (`tsvector` full-text GIN indexes + `pg_trgm` trigram similarity scoring)
- **Background Workers:** `@nestjs/bullmq` / `bullmq` multi-threaded task dispatch
- **Testing:** Vitest (27 unit and domain suites covering connectors, sync, search, intent detection, and prompt pipelines)

---

## Quick Start Guide

1. **Install dependencies across all monorepo workspaces**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   *Ensure `REDIS_ENABLED=true` and your Postgres / Redis credentials match your environment.*

3. **Start PostgreSQL and Redis container services**

   ```bash
   docker compose up -d
   ```

4. **Execute TypeORM relational migrations (creates `pg_trgm` extensions, product tables, and connector schemas)**

   ```bash
   npm run migration:run
   ```

5. **Start development cluster**

   ```bash
   npm run dev
   ```

---

## Production Deployment

This project utilizes a multi-stage Docker build for production.

1. **Configure Production Environment**

   ```bash
   cp apps/api/.env.example .env
   # Update REDIS_ENABLED, POSTGRES credentials, etc.
   ```

2. **Deploy via Docker Compose**

   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

   *The API Gateway binds to port `3001`.*

---

## Available Monorepo Scripts

| Script | Description |
|---|---|
| `npm run dev` | Starts API Gateway, Admin Dashboard, and Embed Widget concurrently |
| `npm run build` | Builds all apps and TypeScript libraries under strict checking |
| `npm run lint` | Runs ESLint analysis across the workspace |
| `npm run typecheck` | Runs TypeScript type verification across all projects |
| `npm run test` | Executes all 27 unit & integration test suites via Vitest |
| `npm run ci` | Full CI verification: lint → typecheck → test → build |
| `npm run migration:run` | Executes pending TypeORM migrations against PostgreSQL |
| `npm run migration:show` | Displays current migration execution logs |
| `npm run migration:revert` | Reverts the last executed TypeORM database migration |

---

## Service URLs (Local Development)

| Service | Development Endpoint |
|---|---|
| Backend API Gateway | <http://localhost:3000> |
| System Health Check | <http://localhost:3000/api/v1/health> |
| Readiness & Redis Probe | <http://localhost:3000/api/v1/health/ready> |
| Management Dashboard | <http://localhost:5173> |
| Chatbot Embed Widget | <http://localhost:5174> |

---

## Core Documentation

- **[Phase D Architecture Report (New)](docs/PHASE_D_REPORT.md)** — In-depth technical guide on Universal Connectors, Hybrid DB Search, Order Privacy, & Anti-Hallucination Prompt Engineering
- **[Product Requirements (PRD)](docs/PRD.md)** — Core mission and platform capabilities
- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** — Architectural diagrams & cloud deployment patterns
- **[Database Schema](docs/DATABASE_SCHEMA.md)** — Relational tables, full-text vectors, & triggers
- **[API Specification](docs/API_SPECIFICATION.md)** — REST endpoints & authentication guardrails
- **[Environment Setup](docs/ENVIRONMENT_SETUP.md)** — Docker & variable configurations
- **[Security & Compliance](docs/SECURITY_REQUIREMENTS.md)** — Data privacy standards & stateless order policies
