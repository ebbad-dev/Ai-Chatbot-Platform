# Testing Strategy

> Revised to match the updated PRD. Focused on website chatbot, not multi-tenant SaaS.

---

## Overview

Testing is organized by workspace and by type. Every workspace must have working `test` and `typecheck` scripts.

---

## Test Tools

| Workspace                | Test Runner         | Environment | Coverage                |
| ------------------------ | ------------------- | ----------- | ----------------------- |
| `apps/api`               | Jest + ts-jest      | Node        | `jest --coverage`       |
| `apps/dashboard`         | Vitest              | jsdom       | `vitest run --coverage` |
| `apps/widget`            | Vitest              | jsdom       | `vitest run --coverage` |
| `packages/shared-types`  | — (type-check only) | —           | —                       |
| `packages/shared-config` | — (config-only)     | —           | —                       |
| `packages/widget-loader` | — (stub, future)    | —           | —                       |

---

## Current Tests (Phase A)

### API Unit Tests

| Test File                       | Tests                                               | Status |
| ------------------------------- | --------------------------------------------------- | ------ |
| `app-config.service.spec.ts`    | Config validation, required vars, Redis optional    | ✅     |
| `health.controller.spec.ts`     | Liveness, readiness with/without Redis              | ✅     |
| `http-exception.filter.spec.ts` | Error formatting, validation errors, unknown errors | ✅     |

### Frontend Smoke Tests

| Test File                         | Tests                    | Status |
| --------------------------------- | ------------------------ | ------ |
| `apps/dashboard/src/App.test.tsx` | Renders without crashing | ✅     |
| `apps/widget/src/App.test.tsx`    | Renders without crashing | ✅     |

---

## Test Patterns

### API Unit Tests

- Use Jest with ts-jest transform
- Mock dependencies (ConfigService, DataSource, Redis)
- Test service methods and controller responses
- Path mapping: `@/*` → `<rootDir>/*`

```typescript
// Example: testing with optional Redis
controller = new HealthController(mockDataSource as DataSource, null); // Redis disabled
controller = new HealthController(mockDataSource as DataSource, mockRedis as any); // Redis enabled
```

### Frontend Tests

- Use Vitest with jsdom environment
- Use `@testing-library/react` for component rendering
- Test that components render without crashing
- Test user interactions as UI develops

---

## Planned Tests (Future Phases)

### Phase B — Chatbot Configuration

- Chatbot CRUD service unit tests
- Public key generation uniqueness
- Domain validation logic
- API endpoint integration tests

### Phase C — Crawler

- URL normalization tests
- robots.txt parsing tests
- Same-origin enforcement tests
- Content extraction unit tests
- Markdown generation tests
- Crawl job lifecycle tests

### Phase D — Retrieval

- Chunk generation tests
- Full-text search query tests
- Relevance ranking tests
- Confidence threshold tests
- Performance benchmarks

### Phase E — Widget

- Loader initialization tests
- iframe creation tests
- Origin validation tests
- postMessage communication tests
- Mobile layout tests

### Phase F — AI

- Prompt construction tests
- Context injection tests
- Fallback trigger tests
- Prompt injection resistance tests

### Phase G — Unanswered Questions

- Question recording tests
- Duplicate grouping tests
- FAQ approval workflow tests
- Reindex verification tests

### Phase H — Production

- Security tests (OWASP basics)
- Load tests (API throughput)
- Cross-chatbot isolation tests
- Widget size verification
- End-to-end crawl-to-answer tests

---

## Running Tests

```bash
# All tests
npm run test

# Specific workspace
npm run test --workspace=apps/api
npm run test --workspace=apps/dashboard
npm run test --workspace=apps/widget

# With coverage
npm run test:coverage

# Watch mode (API)
npm run test:watch --workspace=apps/api

# Type checking only
npm run typecheck
```

---

## Quality Gates

Every phase must pass before proceeding:

```bash
npm run lint        # ESLint — no errors
npm run typecheck   # TypeScript — no type errors
npm run test        # All tests pass
npm run build       # Production build succeeds
```
