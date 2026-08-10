# Phase A Re-baseline Report

**Date:** 2026-07-16
**Status:** ✅ Complete

This report documents the completion of the Phase A re-baseline for the AI Chatbot Platform, strictly following the revised MVP requirements outlined in `docs/PRD.md`.

## 1. Dependency Alignment & Clean Installation

- **TypeScript Alignment:** Realigned `typescript` to `~5.8.0` across the monorepo, resolving build toolchain discrepancies.
- **Node Typings:** Aligned `@types/node` to `^20.14.0` in `dashboard` and `widget` to match the API workspace and avoid peer dependency collisions.
- **Express Typings:** Added missing `@types/express` to the API workspace, fixing type errors in filters and interceptors.
- **Transitive DevDependencies:** Cleaned ~20 manually-hoisted devDependencies in `apps/api/package.json` that were internal to TypeORM CLI, making the lockfile cleaner and preventing version conflicts.
- **React & Vite:** Retained `react@^19.2.7` and `vite@^8.1.1` in the frontend applications as requested, resolving build failures without downgrading.
- **Runtime Dependencies:** Maintained `ioredis` in `dependencies` (not `devDependencies`) since Redis can be conditionally enabled at runtime via `REDIS_ENABLED`.
- **Verification:** The `node_modules` folders and `package-lock.json` were entirely cleared and regenerated from a genuinely clean state. `npm ci` executes successfully without `--legacy-peer-deps`.

## 2. Infrastructure & Configuration Fixes

- **Optional Redis:** The `RedisModule` and `HealthController` were refactored to make Redis optional. Driven by the `REDIS_ENABLED=false` environment variable, the application now starts successfully without Redis, adhering to the MVP scope.
- **PostgreSQL 16 (No pgvector):**
  - Renamed the single TypeORM migration to `1720000000001-EnableUuidOssp.ts` and removed the `CREATE EXTENSION vector` command. Standard PostgreSQL 16 is now sufficient.
  - Adjusted `docker-compose.yml` to use standard `postgres:16-alpine`.
  - Documented in `ENVIRONMENT_SETUP.md` that resetting the local Docker database (`docker compose down -v`) is a destructive action but may be required if the local environment was previously polluted with pgvector data.
- **Strict Validation:** Replaced silent, unsafe fallback defaults in `data-source.ts` (e.g., `localhost`) with rigid environment validations that throw clear errors if database credentials are missing.
- **Secret Removal:** Erased the `apps/api/.env` file from the filesystem and verified it is removed from git tracking, leaving only `.env.example` templates with placeholders.

## 3. Tooling & Workspace Scripts

- **Cross-Platform Dev:** Replaced the bash-specific `&` in the root `dev` script with `concurrently`, ensuring cross-platform stability (especially on Windows).
- **ESLint:** Fixed the ESLint flat config by moving global `ignores` to a separate top-level config block, and replaced `npx eslint` in `package.json` with the local `eslint` executable.
- **Mock Scripts Removed:** Removed placeholder/dummy `test` and `typecheck` scripts from `packages/shared-config`, `packages/shared-types`, and `packages/widget-loader`. The root NPM commands transparently exclude non-applicable workspaces using `--if-present`.
- **Vitest Migration:** Replaced `jest` with `vitest` in the `apps/api` workspace to resolve a deeply-rooted Windows-specific file crawling bug in Jest's HasteMap that caused it to incorrectly report `0 tests found`. This perfectly aligns the backend testing framework with the Vite frontend workspaces and passes the quality gates cleanly without mock scripts.
- **Smoke Tests:** Updated `App.test.tsx` in both `dashboard` and `widget` to match the actual rendered Vite template text, ensuring frontend tests pass out of the box.
- **Shared Types:** Removed obsolete multi-tenant enum definitions and added PRD-aligned enums (`ChatbotStatus`, `CrawlJobStatus`, `ResolutionType`, etc.).

## 4. Documentation Overhaul

All planning documents were rewritten in place to reflect the revised single-tenant, widget-based MVP (superseding all prior plans). Changes are visible in the Git history.

- `README.md`
- `docs/CURRENT_REPOSITORY_AUDIT.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/API_SPECIFICATION.md`
- `docs/SECURITY_REQUIREMENTS.md`
- `docs/ENVIRONMENT_SETUP.md`
- `docs/TESTING_STRATEGY.md`
- `docs/MVP_BACKLOG.md`

## 5. Quality Gates Verification

All scripts passed from a freshly cleaned state:

- ✅ `npm ci`
- ✅ `npm run lint`
- ✅ `npm run typecheck`
- ✅ `npm run test`
- ✅ `npm run build`

## 6. Infrastructure Verification (Docker)

With the local Docker daemon running, the following quality gates and infrastructure requirements were strictly verified:

- **Database State:** Wiped old `pgvector` container volumes successfully via `docker compose down -v` and booted standard `postgres:16-alpine`.
- **Database Migrations:** Ran `npm run migration:run` cleanly, which outputted `Migration EnableExtensions1720000000001 has been executed successfully`, validating that only `uuid-ossp` is needed and `vector` extensions are no longer required.
- **Redis Isolation:**
  - Started the API with `REDIS_ENABLED=false`. Verified the health endpoint natively via `curl.exe`, responding with: `{"status":"ok"}{"status":"ready","dependencies":{"database":"ok","redis":"disabled"}}`.
  - Restarted the compose stack with `docker compose --profile redis up -d` to bring up the optional Redis container.
  - Restarted the API with `REDIS_ENABLED=true`. Verified the health endpoint natively via `curl.exe`, responding with: `{"status":"ok"}{"status":"ready","dependencies":{"database":"ok","redis":"ok"}}`.
- **Monorepo Build Integrity:** Reviewed `--if-present` usage in `package.json`. `shared-types` and `widget-loader` have legitimate `build` (tsc) scripts that run correctly during the monorepo build, and only skip testing since they have no tests. A full `npm run build --workspaces` compiled all Vite frontend bundles and NestJS backends cleanly.
- **Tenancy Data Scoping:** Verified in `DATABASE_SCHEMA.md` that despite deferring multi-tenancy auth for customers, all core application data models (`Document`, `Conversation`, `Message`, `WidgetSettings`, `ApiKey`) remain strictly scoped to `chatbot_id`.

**Conclusion:** The codebase is now stable, dependency-clean, validated against the real Docker infrastructure, and strictly aligned with the revised Phase A requirements. Phase B (Chatbot Configuration) is completely ready to begin.
