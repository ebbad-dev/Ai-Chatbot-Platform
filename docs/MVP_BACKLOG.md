# MVP Backlog

> Revised to match the updated PRD. Ordered by phase.

---

## Phase A — Re-baseline Foundation ✅

- [x] Read and audit existing repository
- [x] Create `docs/CURRENT_REPOSITORY_AUDIT.md`
- [x] Align TypeScript versions across monorepo
- [x] Fix dependency peer conflicts
- [x] Add missing `@types/express`
- [x] Clean unnecessary transitive devDependencies
- [x] Replace `npx eslint` with local `eslint`
- [x] Replace bash `&` dev script with `concurrently`
- [x] Remove non-existent `seed` script
- [x] Fix ESLint flat config (ignores placement)
- [x] Add build/test/typecheck scripts to all workspaces
- [x] Make Redis optional (`REDIS_ENABLED` flag)
- [x] Remove pgvector from MVP migration
- [x] Switch Docker to standard `postgres:16-alpine`
- [x] Move Redis to optional Compose profile
- [x] Fix data source env validation (no silent defaults)
- [x] Fix frontend smoke tests
- [x] Remove committed `.env` file
- [x] Update shared types for revised PRD
- [x] Rewrite all documentation
- [x] Verify quality gates pass
- [x] Create `docs/PHASE_A_REBASELINE_REPORT.md`

---

## Phase B — Chatbot Configuration

- [ ] Create `chatbots` TypeORM entity
- [ ] Create `allowed_domains` TypeORM entity
- [ ] Generate migration for chatbot tables
- [ ] Implement public key generation
- [ ] Create ChatbotConfigModule
- [ ] Internal CRUD endpoints (POST, GET, GET/:id, PATCH)
- [ ] Public config endpoint (GET by public key)
- [ ] Domain validation service
- [ ] Welcome and fallback message configuration
- [ ] Crawl limit and depth configuration
- [ ] Unit tests for all services
- [ ] Integration tests for endpoints
- [ ] Basic dashboard page: list/create chatbots

---

## Phase C — Crawler and Markdown Generation

- [ ] Create `crawl_jobs` entity and migration
- [ ] Create `website_pages` entity and migration
- [ ] Create `contact_records` entity and migration
- [ ] Sitemap.xml discovery service
- [ ] Same-origin link crawler
- [ ] robots.txt parser
- [ ] URL normalizer and deduplicator
- [ ] HTML content extractor
- [ ] JSON-LD structured data extractor
- [ ] Image metadata extractor (alt, title, caption)
- [ ] Content cleaner (remove nav, ads, scripts)
- [ ] Markdown snapshot generator
- [ ] Optional combined site.md generator
- [ ] Contact information extractor
- [ ] Crawl job lifecycle management
- [ ] Internal endpoints: start crawl, status, list pages
- [ ] Dashboard: crawl management UI
- [ ] Unit tests for extractors
- [ ] Integration tests for crawler

---

## Phase D — Chunking and Full-Text Retrieval

- [ ] Create `knowledge_chunks` entity with tsvector
- [ ] Generate migration with GIN index
- [ ] Content chunking algorithm (heading-aware)
- [ ] tsvector generation from chunk content
- [ ] Ranked full-text search query
- [ ] Chatbot-scoped search
- [ ] Configurable top-K results (3–8)
- [ ] Confidence threshold filtering
- [ ] Source URL in results
- [ ] Reindex endpoint
- [ ] Performance tests (< 100ms target)
- [ ] Unit tests for chunker and search

---

## Phase E — Lightweight Widget

- [ ] Widget loader: read public key, create launcher icon
- [ ] Widget loader: inject hosted iframe on click
- [ ] Widget loader: under 20KB gzipped
- [ ] Hosted widget: chat header and welcome message
- [ ] Hosted widget: message list with user/bot messages
- [ ] Hosted widget: text input and send button
- [ ] Hosted widget: typing/loading state
- [ ] Hosted widget: source links in responses
- [ ] Hosted widget: contact fallback display
- [ ] Hosted widget: mobile-responsive layout
- [ ] Hosted widget: retry on error
- [ ] Origin validation middleware
- [ ] Public config API integration
- [ ] Session token management
- [ ] postMessage communication
- [ ] Widget size audit

---

## Phase F — AI Grounded Answering

- [ ] AI provider interface (abstracted)
- [ ] System prompt: website-only answering rules
- [ ] Retrieved chunk context injection
- [ ] Response generation from chunks
- [ ] Unknown-answer detection
- [ ] Safe fallback with contact information
- [ ] Source link generation
- [ ] Prompt injection protections
- [ ] Public message endpoint integration
- [ ] Unit tests for AI service
- [ ] Integration tests for full question flow

---

## Phase G — Unanswered Question Improvement

- [ ] Create `unanswered_questions` entity and migration
- [ ] Create `approved_faqs` entity and migration
- [ ] Record unanswered questions on low confidence
- [ ] Normalize and group similar questions
- [ ] Internal review endpoints
- [ ] Resolution workflow (link page, approve FAQ, out of scope)
- [ ] Reindex approved FAQs into knowledge chunks
- [ ] Dashboard: unanswered questions review UI
- [ ] Dashboard: FAQ management UI
- [ ] Recrawl-aware resolution checks
- [ ] Unit tests for question workflow

---

## Phase H — Production Preparation

- [ ] Security audit (OWASP basics)
- [ ] Crawl safety tests
- [ ] Load tests (concurrent API, search performance)
- [ ] Cross-chatbot data isolation verification
- [ ] Widget bundle size audit (< 20KB gzipped)
- [ ] Mobile browser testing (iOS Safari, Android Chrome)
- [ ] Production deployment configuration
- [ ] Client installation guide
- [ ] Monitoring and alerting setup
- [ ] Documentation review and polish

---

## Out of Scope (Deferred)

- [ ] Voice features (recording, STT, TTS)
- [ ] User media/document uploads
- [ ] Live agent transfer
- [ ] Order/payment integration
- [ ] Open-web search
- [ ] Customer dashboard with subscriptions
- [ ] Advanced analytics
- [ ] Multiple AI providers
- [ ] pgvector semantic search
- [ ] Redis distributed sessions
- [ ] Automatic self-training
- [ ] Image pixel understanding
