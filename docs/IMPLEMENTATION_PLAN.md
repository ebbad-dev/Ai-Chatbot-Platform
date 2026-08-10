# Implementation Plan

> Revised to match the updated PRD. This plan supersedes earlier phase documents.

---

## Overview

The AI Chatbot Platform is built incrementally in phases. Each phase has clear quality gates that must pass before proceeding.

### Deferred Features (Not in MVP)

- Voice features (recording, STT, TTS)
- User media/document uploads
- Live human chat / agent transfer
- Order-status and payment integration
- Open-web search
- Full customer dashboard with subscriptions
- Advanced analytics
- Multiple AI providers
- pgvector semantic search
- Redis distributed sessions
- Automatic self-training from unverified messages

---

## Phase A — Re-baseline Foundation ✅

**Status:** Complete

- Updated all documents to revised PRD
- Made Redis optional (REDIS_ENABLED=false by default)
- Removed pgvector from MVP critical path
- Fixed TypeORM migrations for standard PostgreSQL
- Aligned TypeScript versions across monorepo
- Fixed dependency installation (clean `npm install` / `npm ci`)
- Repaired root scripts (cross-platform dev, local ESLint)
- Fixed frontend smoke tests
- Added widget-loader build script
- Removed committed secrets
- Validated all quality gates

---

## Phase B — Chatbot Configuration

**Goal:** Internal CRUD for chatbot registration and configuration.

### Deliverables

- `chatbots` entity with public key, website origin, welcome/fallback messages
- `allowed_domains` entity for domain validation
- Internal protected CRUD endpoints
- Public chatbot config endpoint (by public key)
- Chatbot creation with auto-generated public key
- Basic validation (URL format, unique constraints)
- Unit tests for all new endpoints
- Migration for chatbot and allowed_domains tables
- Minimal dashboard page for chatbot management

### Quality Gates

- All Phase A gates continue to pass
- New endpoints return correct responses
- Public key lookup works
- Domain validation rejects unauthorized origins

---

## Phase C — Crawler and Markdown Generation

**Goal:** Crawl a configured website, extract content, generate Markdown snapshots.

### Deliverables

- `crawl_jobs` entity and status tracking
- `website_pages` entity for discovered pages
- Sitemap.xml discovery
- Same-origin link crawler with depth/page limits
- robots.txt compliance
- URL normalization and deduplication
- HTML text extraction (headings, paragraphs, lists, tables, FAQs, products, policies, contacts)
- JSON-LD structured data extraction
- Image metadata extraction (alt, title, caption, nearby text)
- Content cleaning (remove scripts, menus, ads, duplicates)
- Markdown snapshot generation per page
- Optional combined site.md export
- `contact_records` extraction and storage
- Crawl job lifecycle (pending → running → completed/failed)
- Internal endpoints: start crawl, check status, list pages

### Quality Gates

- Crawler stays within configured domain
- robots.txt is respected
- URL normalization prevents duplicates
- Markdown output is clean and structured
- Contact information is extracted
- Crawl jobs track progress accurately

---

## Phase D — Chunking and Full-Text Retrieval

**Goal:** Break Markdown into chunks, index with PostgreSQL full-text search, retrieve relevant sections.

### Deliverables

- `knowledge_chunks` entity with tsvector search column
- Chunking algorithm (heading-aware, reasonable size)
- GIN index on search_vector
- Ranked search by chatbot_id
- Configurable top-K results (3–8 chunks)
- Confidence threshold filtering
- Source page URL in results
- Performance benchmarks

### Quality Gates

- Search returns relevant chunks for test queries
- Results are scoped to the correct chatbot
- GIN index is used (EXPLAIN ANALYZE)
- Response time under 100ms for typical queries

---

## Phase E — Lightweight Widget

**Goal:** Client-installable loader script and hosted chatbot iframe.

### Deliverables

- Widget loader: reads public key, creates launcher icon, injects iframe
- Loader under ~20KB gzipped, no React, no AI SDK
- Hosted React widget inside iframe
- Text input and message list
- Typing/loading state
- Source links in responses
- Contact fallback display
- Mobile-responsive layout
- Origin validation (allowed domains)
- postMessage communication between loader and widget

### Quality Gates

- Loader does not block host page load
- Widget displays correctly on mobile
- Origin validation rejects unauthorized domains
- No secrets in browser-accessible code

---

## Phase F — AI Grounded Answering

**Goal:** Generate AI answers using only retrieved website chunks.

### Deliverables

- AI provider interface (abstracted for future multi-provider)
- System prompt enforcing website-only answering
- Retrieved chunk context injection
- Unknown-answer detection and safe fallback
- Source link generation
- Prompt injection protections
- No open-web search
- Public chat message endpoint

### Quality Gates

- AI answers only from retrieved content
- Unknown questions get fallback response
- Source links are accurate
- Prompt injection attempts are blocked

---

## Phase G — Unanswered Question Improvement

**Goal:** Record, group, and resolve unanswered questions through controlled workflow.

### Deliverables

- `unanswered_questions` entity
- `approved_faqs` entity
- Question recording on low-confidence responses
- Duplicate question grouping
- Internal review interface
- FAQ approval workflow
- Reindex approved FAQs into knowledge chunks
- Recrawl-aware question resolution

### Quality Gates

- Unanswered questions are recorded
- Similar questions are grouped
- Approved FAQs appear in future search results
- No automatic self-training

---

## Phase H — Production Preparation

**Goal:** Security hardening, testing, deployment.

### Deliverables

- Security tests (OWASP basics)
- Crawl safety tests (no cross-origin, no mutation URLs)
- Load tests for API and search
- Cross-chatbot isolation verification
- Widget size audit
- Mobile browser testing
- Deployment configuration
- Client installation guide
- Monitoring and alerting setup

### Quality Gates

- No critical security vulnerabilities
- Widget under 20KB gzipped
- API handles expected concurrent load
- Chatbot data is fully isolated
