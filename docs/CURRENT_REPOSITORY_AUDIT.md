# Current Repository Audit

**Date:** 2026-07-16  
**Basis:** Revised PRD (`docs/PRD.md`)  
**Auditor:** Phase A Re-baseline

---

## Classification Legend

| Status                | Meaning                              |
| --------------------- | ------------------------------------ |
| ✅ Complete           | Working and aligned with revised PRD |
| 🟡 Partially complete | Present but needs fixes              |
| 🔴 Broken             | Exists but fails or cannot work      |
| 🟠 Obsolete           | Conflicts with revised requirements  |
| ⬜ Not implemented    | Required but absent                  |

---

## 1. Monorepo Structure

**Status: ✅ Complete**

- Root `package.json` defines `workspaces: ["packages/*", "apps/*"]`
- Three apps: `apps/api`, `apps/dashboard`, `apps/widget`
- Three packages: `packages/shared-types`, `packages/shared-config`, `packages/widget-loader`
- Structure matches revised PRD section 15

**Files:**

- `package.json` (root)
- `apps/api/package.json`
- `apps/dashboard/package.json`
- `apps/widget/package.json`
- `packages/shared-types/package.json`
- `packages/shared-config/package.json`
- `packages/widget-loader/package.json`

---

## 2. Dependency Installation

**Status: 🔴 Broken**

**Root cause:** TypeScript version conflict across workspaces:

- Root: `typescript ^5.0.0`
- API: `typescript ~5.6.0`
- Dashboard/Widget: `typescript ~6.0.2`
- `@types/node` ranged `^20.14.0` (API) vs `^24.13.2` (dashboard/widget)

**Additional issues:**

- Missing `@types/express` in API devDependencies
- API `package.json` contains ~20 unnecessary manually-listed transitive devDependencies from TypeORM CLI internals (acorn, ansis, buffer, sha.js, app-root-path, etc.)
- Dashboard/Widget `tsconfig.app.json` uses `erasableSyntaxOnly` which requires TypeScript ≥5.8
- React `^19.2.7` and Vite `^8.1.1` are bleeding-edge versions

**Evidence:** `npm ci` fails without `--legacy-peer-deps`

---

## 3. NestJS API

**Status: 🟡 Partially complete**

**Working:**

- Bootstrap in `apps/api/src/main.ts`: validation pipe, exception filter, correlation interceptor, CORS, global prefix
- `AppModule` with TypeORM and config modules
- `AppConfigService` with typed getters and `getRequired()` validation
- `AppConfigModule` as global module with env file loading
- Jest configuration with path mapping

**Issues:**

- `AppConfigService.redisHost`/`redisPort` use `getRequired()` — will throw if Redis env vars are missing
- `data-source.ts` uses silent fallback defaults (`|| 'localhost'`, `|| 'postgres'`) that could connect to wrong DB in production
- Missing `@types/express` causes type errors in filter and interceptor

**Files:**

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/config/app-config.service.ts`
- `apps/api/src/config/app-config.module.ts`
- `apps/api/src/config/index.ts`
- `apps/api/jest.config.ts`
- `apps/api/nest-cli.json`

---

## 4. TypeORM / Database

**Status: 🟡 Partially complete**

**Working:**

- `data-source.ts` exports `DataSource` and `getDataSourceOptions()`
- `synchronize: false` enforced
- Migration directory structure exists
- Migration CLI scripts in API `package.json`
- `dotenv` loaded for CLI context

**Issues:**

- Silent fallback defaults in `data-source.ts` (dangerous for production)
- Single migration `1720000000001-EnablePgvectorExtension.ts` requires pgvector — blocks standard PostgreSQL
- Migration has not been verified against real Docker PostgreSQL

**Files:**

- `apps/api/src/database/data-source.ts`
- `apps/api/src/database/migrations/1720000000001-EnablePgvectorExtension.ts`

---

## 5. Redis Module

**Status: 🟠 Obsolete under revised requirements**

Redis is treated as mandatory, but the revised PRD makes it optional for MVP:

- `RedisModule` creates ioredis connection unconditionally
- `HealthController` requires `@Inject('REDIS_CLIENT')` — crashes if Redis unavailable
- `AppConfigService.redisHost`/`redisPort` call `getRequired()` — throws on missing vars
- `AppModule` imports `RedisModule` unconditionally

**Files:**

- `apps/api/src/redis/redis.module.ts`

---

## 6. Health Endpoints

**Status: 🟡 Partially complete**

**Working:**

- `GET /api/v1/health` — liveness check
- `GET /api/v1/health/ready` — readiness with DB + Redis checks
- Real PostgreSQL `SELECT 1` query for DB check
- Unit tests for both endpoints

**Issues:**

- Redis check is mandatory — readiness fails if Redis is absent
- Health controller tests assume Redis is always injected

**Files:**

- `apps/api/src/health/health.controller.ts`
- `apps/api/src/health/health.controller.spec.ts`
- `apps/api/src/health/health.module.ts`

---

## 7. Exception Filter & Correlation ID

**Status: ✅ Complete**

- `HttpExceptionFilter` handles all exceptions with consistent format
- `CorrelationInterceptor` generates/propagates UUID correlation IDs
- Both have unit tests
- Response format: `{ statusCode, code, message, correlationId, details? }`

**Files:**

- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/src/common/filters/http-exception.filter.spec.ts`
- `apps/api/src/common/interceptors/correlation.interceptor.ts`
- `apps/api/src/common/index.ts`

---

## 8. Environment Configuration

**Status: 🟡 Partially complete**

**Working:**

- `.env.example` files for root, API, dashboard, widget
- `AppConfigService` validates required vars at access time
- `.gitignore` excludes `.env` files

**Issues:**

- `apps/api/.env` is committed with development credentials (identical to `.env.example`)
- `data-source.ts` uses silent fallback defaults instead of failing
- Redis vars marked as required but should be optional
- `DATABASE_PASSWORD=postgres` in example should indicate it needs changing

**Files:**

- `.env.example` (root)
- `apps/api/.env.example`
- `apps/api/.env` (COMMITTED — should not exist)
- `apps/dashboard/.env.example`
- `apps/widget/.env.example`

---

## 9. React Dashboard

**Status: 🟡 Partially complete (starter template)**

The dashboard is the unmodified Vite+React starter template:

- `App.tsx` renders "Get started" with Vite/React logos and a counter
- `App.test.tsx` asserts `screen.getByText(/Vite \+ React/i)` which doesn't match actual content
- Vite and vitest configs are functional
- TypeScript configs use `erasableSyntaxOnly` (requires TS 5.8+)

**Files:**

- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/App.test.tsx`
- `apps/dashboard/src/main.tsx`
- `apps/dashboard/src/App.css`
- `apps/dashboard/src/index.css`
- `apps/dashboard/index.html`
- `apps/dashboard/vite.config.ts`
- `apps/dashboard/vitest.config.ts`
- `apps/dashboard/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

---

## 10. React Widget

**Status: 🟡 Partially complete (starter template)**

Identical to dashboard — unmodified Vite+React starter template with same issues.

**Files:**

- `apps/widget/src/App.tsx`
- `apps/widget/src/App.test.tsx`
- `apps/widget/src/main.tsx`
- `apps/widget/vite.config.ts`
- `apps/widget/vitest.config.ts`

---

## 11. Widget Loader

**Status: 🟡 Partially complete (stub)**

- Development stub that logs initialization
- Reads `data-chatbot-key` and `data-widget-url` attributes
- Does NOT create iframe or inject widget
- No `build` script — cannot produce `loader.js`
- No `test` script

**Files:**

- `packages/widget-loader/src/loader.ts`
- `packages/widget-loader/package.json`
- `packages/widget-loader/tsconfig.json`

---

## 12. Shared Types

**Status: 🟠 Obsolete under revised requirements**

Contains types for the older multi-tenant SaaS architecture:

- `OrganizationStatus`, `UserRole`, `UserStatus` — not in revised MVP
- `HandoffStatus`, `PreferredContact` — deferred features
- `KnowledgeSourceType` (PDF, TEXT) — MVP uses website-only
- `ReadinessCheckResponse.redis` — should be optional

**Useful types to keep:** `ChatbotStatus`, `ApiErrorResponse`, `PaginatedResponse`, `HealthCheckResponse`, `ChatbotBranding`

**Files:**

- `packages/shared-types/src/index.ts`
- `packages/shared-types/tsconfig.json`

---

## 13. Shared Config

**Status: 🟡 Partially complete (empty)**

Package exists but contains no source files, no scripts, no configurations. It's a placeholder.

**Files:**

- `packages/shared-config/package.json`

---

## 14. Root Scripts

**Status: 🟡 Partially complete**

| Script         | Issue                                                      |
| -------------- | ---------------------------------------------------------- |
| `dev`          | Uses `&` (bash background) — not cross-platform on Windows |
| `lint`         | Uses `npx eslint .` instead of local `eslint .`            |
| `lint:fix`     | Uses `npx eslint .` instead of local `eslint .`            |
| `format`       | Uses `npx prettier` instead of local `prettier`            |
| `format:check` | Uses `npx prettier` instead of local `prettier`            |
| `seed`         | References non-existent API seed command                   |
| `build`        | ✅ Works via `--workspaces --if-present`                   |
| `typecheck`    | ✅ Works via `--workspaces --if-present`                   |
| `test`         | ✅ Works via `--workspaces --if-present`                   |
| `ci`           | ✅ Chains lint, typecheck, test, build                     |
| `migration:*`  | ✅ Delegates to API workspace                              |

---

## 15. ESLint / Prettier

**Status: 🟡 Partially complete**

- ESLint flat config (`eslint.config.mjs`) exists
- `ignores` placed inside rule config object instead of as separate top-level config — won't work correctly in flat config
- Uses `recommendedTypeChecked` and `stylisticTypeChecked` — may cause cross-workspace project reference issues
- References non-existent rule `@typescript-eslint/interface-name-prefix`
- Prettier config (`.prettierrc`) is complete and correct

**Files:**

- `eslint.config.mjs`
- `.prettierrc`

---

## 16. Docker Compose

**Status: 🟡 Partially complete**

- Uses `pgvector/pgvector:pg16` — requires pgvector but MVP uses standard PostgreSQL
- Redis is always started — should be optional for MVP
- Health checks are properly configured
- Volume persistence is configured

**Files:**

- `docker-compose.yml`

---

## 17. Git Configuration

**Status: 🟡 Partially complete**

- `.gitignore` covers `node_modules/`, `dist/`, `build/`, `.env`, `coverage/`, IDE files, OS files, logs
- Missing: `*.tsbuildinfo` pattern (present but verified as working)
- `apps/api/.env` is committed despite `.gitignore` — the `.env` pattern should catch it but the file was already tracked

**Files:**

- `.gitignore`

---

## 18. Documentation

**Status: 🟠 Obsolete under revised requirements**

All existing docs describe the older multi-tenant SaaS architecture:

- `docs/IMPLEMENTATION_PLAN.md` — references old phase structure
- `docs/SYSTEM_ARCHITECTURE.md` — describes Redis sessions, pgvector RAG, multi-tenancy
- `docs/DATABASE_SCHEMA.md` — includes organizations, users, roles, invitations
- `docs/API_SPECIFICATION.md` — includes auth, org, invitation endpoints
- `docs/SECURITY_REQUIREMENTS.md` — references user auth, sessions
- `docs/ENVIRONMENT_SETUP.md` — lists Redis as required
- `docs/TESTING_STRATEGY.md` — references old features
- `docs/MVP_BACKLOG.md` — based on old scope
- `README.md` — references multi-tenant, pgvector RAG, Redis sessions, seed command

**Files:** All files in `docs/` except `PRD.md`

---

## 19. Tests

**Status: 🔴 Broken**

- API unit tests: `app-config.service.spec.ts`, `health.controller.spec.ts`, `http-exception.filter.spec.ts` — well-structured but assume mandatory Redis
- Dashboard test: asserts `"Vite + React"` but App renders `"Get started"` — will fail
- Widget test: same issue as dashboard
- E2E test config exists (`test/jest-e2e.json`) but no e2e tests

---

## Summary Table

| Area               | Status      | Action Required                                |
| ------------------ | ----------- | ---------------------------------------------- |
| Monorepo structure | ✅ Complete | None                                           |
| Dependencies       | 🔴 Broken   | Align TS, fix peer deps, clean transitive deps |
| NestJS API         | 🟡 Partial  | Add @types/express, fix Redis optionality      |
| TypeORM / Database | 🟡 Partial  | Fix defaults, remove pgvector from migration   |
| Redis module       | 🟠 Obsolete | Make conditional with feature flag             |
| Health endpoints   | 🟡 Partial  | Make Redis check optional                      |
| Exception filter   | ✅ Complete | None                                           |
| Correlation ID     | ✅ Complete | None                                           |
| Environment config | 🟡 Partial  | Remove committed .env, fix validation          |
| Dashboard          | 🟡 Partial  | Fix test assertion                             |
| Widget             | 🟡 Partial  | Fix test assertion                             |
| Widget loader      | 🟡 Partial  | Add build/test scripts                         |
| Shared types       | 🟠 Obsolete | Replace multi-tenant types                     |
| Shared config      | 🟡 Partial  | Add stub scripts                               |
| Root scripts       | 🟡 Partial  | Fix lint, dev, remove seed                     |
| ESLint             | 🟡 Partial  | Fix flat config ignores                        |
| Docker Compose     | 🟡 Partial  | Standard postgres, optional Redis              |
| Git config         | 🟡 Partial  | Remove committed .env                          |
| Documentation      | 🟠 Obsolete | Full rewrite to revised PRD                    |
| Tests              | 🔴 Broken   | Fix assertions and Redis assumptions           |
