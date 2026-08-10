# Security Requirements

> Revised to match the updated PRD. Auth/session security deferred to multi-tenancy phase.

---

## Security Principles

1. **No secrets in browser code** — API keys, database credentials, and AI provider keys never reach the client
2. **Website-only knowledge** — chatbot never searches the open web
3. **Origin validation** — widget only works on allowed domains
4. **Fail safe** — unknown answers produce safe fallback, never guessed information
5. **No automatic learning** — unanswered questions are manually reviewed before becoming knowledge
6. **Data isolation** — all data scoped by chatbot_id

---

## Current Implementation (Phase A)

### Environment Security

- `.env` files are gitignored — never committed
- Environment variables fail fast on missing values — no silent defaults
- Database credentials are required at startup — no fallback to default passwords
- `DATABASE_PASSWORD` placeholder in `.env.example` indicates it must be changed

### API Security

- Global validation pipe with DTO allowlisting (`whitelist: true, forbidNonWhitelisted: true`)
- Global exception filter — internal errors never expose stack traces to clients
- Correlation ID on every request for tracing
- CORS with configurable allowed origins
- Structured error responses with consistent format

### Infrastructure

- PostgreSQL in Docker with health checks
- Redis optional (not required for MVP)
- No production credentials in example files
- TypeORM `synchronize: false` — schema changes only through migrations

---

## Planned Security (Future Phases)

### Widget Security (Phase E)

- Public chatbot key validation on every request
- Origin/domain validation against `allowed_domains`
- Short-lived signed session tokens
- No session data in Redis (MVP) — context in browser only
- Rate limiting per session and per IP
- Content Security Policy headers
- iframe sandbox attributes

### Crawl Security (Phase C)

- Only crawl configured website origin — no arbitrary URLs
- robots.txt compliance
- URL normalization to prevent path traversal
- Blocklist for unsafe URLs (logout, cart mutations, checkout)
- Maximum page count and depth limits
- HTTP-only crawling (no browser automation by default)

### AI Security (Phase F)

- System prompt enforcement — website-only answering
- Prompt injection protections
- No revelation of system instructions
- No execution of visitor-provided code
- Context window limited to retrieved chunks only

### Internal API Security (Phase B+)

- Protected internal endpoints (not exposed to widget/visitors)
- API key or basic auth for internal management
- Full auth system deferred to multi-tenancy phase

---

## Deferred Security Features

| Feature                   | Phase         |
| ------------------------- | ------------- |
| User authentication (JWT) | Multi-tenancy |
| Role-based access control | Multi-tenancy |
| Refresh token rotation    | Multi-tenancy |
| Redis session management  | Post-MVP      |
| Rate limiting middleware  | Phase E       |
| OWASP security testing    | Phase H       |
| Penetration testing       | Phase H       |
| API key rotation          | Multi-tenancy |
| Audit logging             | Post-MVP      |
| Data encryption at rest   | Post-MVP      |

---

## Data Protection

### What is stored

- Chatbot configuration
- Crawled website content (publicly available information)
- Knowledge chunks for search
- Contact information extracted from public pages
- Unanswered question summaries (no PII)
- Approved FAQ entries

### What is NOT stored

- Full visitor conversations (not persisted by default)
- Visitor personal information
- Payment data
- Authentication credentials (deferred)
- AI provider API keys (server-side only, never in responses)

### Sensitive Data Handling

- API keys and secrets: environment variables only
- Database password: required, no default
- No credentials in version control
- No credentials in error responses
- No credentials in client-accessible JavaScript
