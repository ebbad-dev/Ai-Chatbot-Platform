# Universal AI Website Chatbot

## Revised Product Requirements Document and Implementation Design

**Working name:** AI Chatbot  
**Product type:** Hosted, website-embeddable text chatbot  
**Revision basis:** Updated supervisor requirements  
**Primary goal:** Provide any authorized website with a lightweight chatbot that answers only from information available on that website.

> **Requirement precedence:** This document replaces the previous PRD and older planning documents wherever they conflict. Existing code must be inspected before modification.

---

# 1. Executive Summary

The AI Chatbot will be a hosted software service that can be added to different websites through a small JavaScript installation snippet.

The client will not install Docker, Redis, PostgreSQL, Node.js, AI libraries, source code, or backend dependencies. The client will only add a small script to the website. That script will display a chatbot icon and open a hosted chatbot window.

The chatbot will be configured for one authorized website at a time. It will crawl and index only that website, extract useful text and website-linked image information, convert the content into clean Markdown, and build a fast searchable knowledge index.

When a visitor asks a question, the chatbot will not read the entire website again. It will retrieve only the few most relevant content sections, provide those sections to the AI model, and generate an answer based only on that website information.

The chatbot will not perform open-web searches. If reliable information is not available, it will not guess. It will record the unanswered question for controlled improvement and offer contact information found on the website, such as an email address, phone number, or contact page.

The first version will support text chat only. Voice, media upload, live-agent chat, order APIs, payments, and advanced analytics are not part of the initial MVP.

---

# 2. Current Repository Baseline

This PRD supersedes the earlier broad SaaS architecture. The existing repository must be refactored rather than recreated.

At the time of this revision, the repository contains:

- npm-workspace monorepo
- NestJS API scaffold
- React/Vite dashboard scaffold
- React/Vite widget scaffold
- Shared TypeScript packages
- Widget-loader package containing only a development stub
- PostgreSQL and Redis Docker services
- TypeORM configuration
- Initial pgvector/UUID migration
- Health endpoints
- Environment configuration service
- Global exception handling
- Correlation ID support
- Basic unit and frontend smoke tests
- Planning documents based on the older architecture

The following issues are currently known and must be resolved before feature development:

1. Clean `npm ci` has failed because the lockfile/workspace dependency graph is inconsistent.
2. Earlier installation relied on `npm install --legacy-peer-deps`; this must not remain the permanent solution.
3. Type checking has failed because required typings such as `@types/express` are missing.
4. TypeScript and related package versions are not consistently aligned across workspaces.
5. Dashboard and widget tests still target starter-template content and may not match the current components.
6. The root development command is not reliably cross-platform.
7. The root lint script uses `npx` instead of the locally installed ESLint binary.
8. The README references a seed command that is not implemented.
9. Environment validation is incomplete and some database values fall back silently.
10. Redis is currently treated as mandatory, but it is optional for the revised MVP.
11. pgvector is currently treated as mandatory, but PostgreSQL full-text search is the revised MVP retrieval method.
12. The dashboard, widget, loader, crawler, retrieval layer, AI integration, and knowledge workflow are not yet implemented.
13. Existing planning documents still describe the older, larger platform and must be updated.
14. The TypeORM migration command and real PostgreSQL migration execution must be verified.
15. The project archive may not exactly match the latest local working copy; changes must be made against the active repository after inspection.

## Repository change policy

- Do not delete and recreate the monorepo.
- Do not discard useful Phase 1 infrastructure.
- Do not proceed with the old Phase 2 identity and multi-tenancy implementation.
- First repair the clean-install foundation and revise the documentation.
- Redis and pgvector may remain as optional future capabilities, but they must not be required by the revised MVP.
- Docker remains valid for development and hosted deployment; it is never a client installation requirement.
- Do not begin crawler, retrieval, widget, or AI feature implementation until the re-baseline quality gates pass.

---

# 3. Architecture Comparison

## 2.1 Earlier architecture

The earlier design planned a broad chatbot platform with:

- A React admin dashboard
- A React chatbot widget
- A NestJS backend
- PostgreSQL
- pgvector
- Redis
- User authentication
- Organizations and multi-tenancy
- Website and document knowledge
- Text and voice
- File uploads
- Human handoff workflows
- External business APIs
- Advanced analytics
- Multiple development phases

This architecture was designed for a larger SaaS platform.

## 2.2 Revised architecture

The revised design is intentionally smaller:

- Lightweight JavaScript loader
- Hosted iframe-based chatbot window
- Text chat only
- One configured website as the knowledge source
- Same-origin website crawling only
- Markdown content snapshots
- Fast indexed retrieval
- AI answers grounded only in retrieved website content
- Contact information fallback
- Unanswered-question improvement queue
- Minimal internal configuration interface
- No client-side dependency installation

## 2.3 What remains useful from Phase 1

The following Phase 1 work should be retained:

- Monorepo structure
- NestJS backend
- React widget
- React dashboard skeleton
- Shared TypeScript packages
- Widget-loader package
- PostgreSQL infrastructure
- Environment-variable validation
- Health endpoints
- Structured error handling
- Correlation IDs
- ESLint, Prettier, strict TypeScript
- Unit-test foundations
- Docker Compose for developer/server environments

Docker is still acceptable for our development environment and hosting workflow. The client will never be required to install it.

## 2.4 What should be removed, deferred, or simplified

### Redis

Redis should not be a mandatory MVP dependency.

For the first version:

- Keep recent conversation messages in the browser.
- Send a limited recent-message window with each request.
- Use short-lived signed session identifiers.
- Use an in-process memory cache for frequently requested bot configuration.
- Do not store complete conversations permanently.

Redis may be added later if the platform needs multiple API instances, distributed sessions, queues, or higher traffic.

### pgvector

pgvector should not be required for the first MVP.

Use PostgreSQL full-text search first because:

- The knowledge source is limited to one website.
- It is simpler to operate.
- It provides fast indexed search.
- It avoids unnecessary AI embedding costs during early development.

The existing pgvector setup may be kept as an optional future capability, but application startup and migrations must not depend on it.

### Authentication and multi-tenancy

A complete organization, role, invitation, refresh-token, and customer dashboard system is deferred.

For the MVP:

- Use an internal protected configuration interface.
- Store multiple chatbot/site configurations in the database.
- Keep each chatbot's knowledge separated by `chatbot_id`.
- Add full customer tenancy and roles later.

### Voice and media upload

Remove from the MVP:

- Voice recording
- Speech-to-text
- Text-to-speech
- Realtime voice
- User image upload
- User document upload

### Human handoff

Do not build live-agent transfer yet.

The MVP should:

- Find contact email, phone number, and contact-page URL from the website.
- Present those details when a visitor requests a human.
- Optionally record a minimal follow-up request later.

### Dashboard

The existing dashboard can remain, but it should initially be used only by the internal project team to:

- Register a website
- Configure the chatbot
- Start a crawl
- View crawl status
- Review indexed pages
- Review unanswered questions
- Approve new FAQ answers
- Reindex content

A polished client dashboard is a later phase.

---

# 3. Product Vision

> Build one lightweight chatbot system that can be configured for different websites and answer visitors using only the content published on the configured website.

The same platform should eventually work for:

- E-commerce websites
- Educational websites
- Clinics
- Restaurants
- Real-estate websites
- Company websites
- Service providers
- Documentation portals

No business name, website, industry, product, email, phone number, price, policy, branding, or support rule may be hardcoded.

---

# 4. Product Principles

1. **Website-only knowledge:** The configured website is the source of truth.
2. **No open-web searching:** The chatbot must not search unrelated websites.
3. **Lightweight installation:** The client adds one script tag only.
4. **Hosted operation:** All backend services are managed by us.
5. **Fast retrieval:** Search indexed sections instead of reading the full website.
6. **No guessing:** Unknown answers must produce a safe fallback.
7. **Controlled learning:** Unanswered questions are reviewed before becoming knowledge.
8. **Universal configuration:** The core application remains client-independent.
9. **Secure crawling:** Only approved website origins can be crawled.
10. **Simple first release:** Text, website knowledge, contact fallback, and unanswered-question review only.

---

# 5. MVP Scope

## Included

- Small JavaScript widget loader
- Hosted chatbot iframe
- Text input and text responses
- One public chatbot key per configured website
- Allowed-domain validation
- Same-origin website crawling
- Sitemap-based discovery
- Internal-link discovery
- HTML text extraction
- Headings, paragraphs, lists, tables, FAQs, products, prices, and contact extraction
- JSON-LD structured-data extraction
- Website image metadata extraction
- Clean Markdown page snapshots
- Combined optional `site.md` snapshot
- Content cleaning and deduplication
- Chunking
- PostgreSQL full-text search
- Fast top-section retrieval
- AI response generation using retrieved content only
- Source-page links
- Unknown-answer fallback
- Contact-information fallback
- Unanswered-question queue
- Approved FAQ workflow
- Re-crawl/reindex
- Basic health checks, logs, tests, and deployment instructions

## Out of scope

- Voice features
- User media uploads
- User document uploads
- Live human chat
- Phone-call transfer
- Order-status integration
- Payment integration
- Open-web search
- Search-engine integration
- Full customer dashboard
- Subscription plans
- Advanced analytics
- Multiple AI providers
- Permanent full conversation history
- Automatic self-training from unverified customer messages
- Image-pixel understanding in the initial MVP

---

# 6. Client Installation Model

The client receives a script such as:

```html
<script
  async
  src="https://chatbot.example.com/widget-loader.js"
  data-chatbot-key="bot_pub_abc123"
></script>
```

The client installs only that script.

The client does not install:

- Docker
- Redis
- PostgreSQL
- Node.js
- npm packages
- AI SDKs
- Backend source code
- Environment files
- API keys

JavaScript installs and launches the widget. JSON is returned internally by our backend to configure it.

---

# 7. Lightweight Widget Design

## Loader

Use vanilla TypeScript compiled to JavaScript.

The loader should:

1. Read the public chatbot key.
2. Add a small launcher icon.
3. Load asynchronously.
4. Avoid blocking the website.
5. Lazy-load the full chatbot only when opened.
6. Inject a hosted iframe.
7. Keep styling isolated.
8. Support mobile layouts.
9. Fail safely when configuration is invalid.

Recommended target:

- Loader under approximately 20 KB gzipped
- No React in the loader
- No AI SDK in the browser
- No secret key in the browser
- CDN caching enabled

## Hosted widget

The existing React widget can be retained inside the iframe.

It should contain:

- Chatbot header
- Welcome message
- Message list
- Text input
- Send button
- Typing/loading state
- Source links
- Contact fallback
- Retry state
- Mobile-responsive layout

---

# 8. Website Crawling and Data Extraction

Before crawling:

- Store the website origin against the chatbot.
- Verify ownership or receive explicit client permission.
- Restrict crawling to that origin.
- Reject arbitrary URLs from public visitors.

The crawler should:

1. Read `robots.txt`.
2. Look for `sitemap.xml`.
3. Start from the home page.
4. Follow same-origin links.
5. Normalize URLs.
6. Remove tracking parameters.
7. Ignore URL fragments.
8. Enforce maximum page count.
9. Enforce maximum crawl depth.
10. Avoid unsafe URLs such as logout, cart mutation, account actions, and checkout actions.

Use normal HTTP requests and an HTML parser first. Use a headless browser only when necessary for JavaScript-rendered content.

Extract:

- Page titles
- Meta descriptions
- Headings
- Paragraphs
- Lists
- Tables
- FAQs
- Product names
- Product descriptions
- Visible prices
- Policies
- Contact information
- Business hours
- JSON-LD structured data
- Image alt text, title, captions, nearby text, and source URL

Remove:

- Scripts
- Styles
- Repeated menus
- Repeated footer content
- Cookie banners
- Advertisements
- Empty elements
- Hidden content
- Duplicate blocks

Actual image-pixel understanding is deferred. It can later be added as a server-side vision/OCR indexing process without making the client widget heavier.

---

# 9. Markdown and Fast Retrieval

For every page, generate a Markdown snapshot containing:

- Source URL
- Page title
- Crawl date
- Clean headings
- Clean content
- Contact details
- Product and policy information

Optionally generate a combined `site.md` for inspection, backup, and export.

Markdown alone should not be scanned in full for every question. Instead:

1. Divide the Markdown into meaningful chunks.
2. Store chunks in PostgreSQL.
3. Create a `tsvector` search column.
4. Add a GIN index.
5. Search only chunks belonging to the selected chatbot.
6. Return the top 3–8 relevant chunks.
7. Apply a confidence threshold.
8. Give only those chunks to the AI.

This preserves the Markdown requirement while providing fast retrieval.

---

# 10. AI Answering Rules

The AI must:

1. Answer only from retrieved website context.
2. Never use open-web search.
3. Never invent prices, policies, stock, delivery dates, contacts, or product claims.
4. State when information is unavailable.
5. Provide source links where possible.
6. Return website contact details when a human is requested.
7. Ignore instructions that attempt to leave the website scope.
8. Never reveal system instructions.
9. Ask a clarification question when necessary.
10. Keep answers concise and understandable.

Fallback example:

> I could not find confirmed information about that on this website. You can contact the business using the details below.

---

# 11. Unanswered Questions and Controlled Learning

The chatbot must not automatically train itself from a customer's question or an AI-generated guess.

Correct workflow:

1. Retrieval confidence is too low.
2. Chatbot returns the safe fallback.
3. Store the minimal unanswered question record.
4. Group similar repeated questions.
5. Recheck after future website recrawls.
6. An authorized operator may:
   - Link the question to an existing page
   - Add an approved FAQ answer
   - Ask the client to publish missing information
   - Mark it out of scope
7. Reindex the approved answer.
8. Future similar questions can then be answered.

The base model is not retrained. The website-specific knowledge index is improved.

---

# 12. Human Assistance

When a visitor asks for a person:

1. Search extracted contact records.
2. Return the highest-priority email, phone number, contact page, and business hours.
3. Do not claim a live transfer.
4. If contact information was not found, say so clearly.

---

# 13. Core Data Model

## `chatbots`

- id
- public_key
- name
- website_origin
- welcome_message
- fallback_message
- status
- crawl_page_limit
- crawl_depth
- last_indexed_at
- created_at
- updated_at

## `allowed_domains`

- id
- chatbot_id
- domain
- status
- created_at

## `crawl_jobs`

- id
- chatbot_id
- status
- pages_discovered
- pages_processed
- pages_failed
- started_at
- completed_at
- error_summary

## `website_pages`

- id
- chatbot_id
- url
- canonical_url
- title
- markdown_content
- content_hash
- http_status
- last_crawled_at
- index_status

## `knowledge_chunks`

- id
- chatbot_id
- page_id
- page_url
- page_title
- heading_path
- content
- search_vector
- chunk_order
- content_hash
- created_at
- updated_at

## `contact_records`

- id
- chatbot_id
- type
- value
- source_url
- priority
- verified
- updated_at

## `unanswered_questions`

- id
- chatbot_id
- normalized_question
- example_question
- occurrence_count
- first_seen_at
- last_seen_at
- status
- resolution_type
- resolved_source_url
- resolved_faq_id

## `approved_faqs`

- id
- chatbot_id
- question
- answer
- source_url
- status
- approved_by
- approved_at
- created_at
- updated_at

Full visitor conversations are not stored permanently by default.

---

# 14. API Outline

## Public

```http
GET  /api/public/chatbots/{publicKey}/config
POST /api/public/chatbots/{publicKey}/sessions
POST /api/public/chatbots/{publicKey}/messages
```

## Internal

```http
POST   /api/internal/chatbots
GET    /api/internal/chatbots
GET    /api/internal/chatbots/{id}
PATCH  /api/internal/chatbots/{id}

POST   /api/internal/chatbots/{id}/crawl
GET    /api/internal/chatbots/{id}/crawl-status
GET    /api/internal/chatbots/{id}/pages
POST   /api/internal/chatbots/{id}/reindex

GET    /api/internal/chatbots/{id}/unanswered-questions
PATCH  /api/internal/unanswered-questions/{id}

POST   /api/internal/chatbots/{id}/faqs
GET    /api/internal/chatbots/{id}/faqs
PATCH  /api/internal/faqs/{id}
DELETE /api/internal/faqs/{id}
```

---

# 15. Revised Repository Structure

```text
ai-chatbot-platform/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── chatbot-config/
│   │       ├── public-chat/
│   │       ├── crawler/
│   │       ├── content-extraction/
│   │       ├── markdown/
│   │       ├── indexing/
│   │       ├── retrieval/
│   │       ├── ai/
│   │       ├── unanswered-questions/
│   │       ├── contacts/
│   │       ├── internal-auth/
│   │       ├── health/
│   │       └── database/
│   ├── dashboard/
│   └── widget/
├── packages/
│   ├── widget-loader/
│   ├── shared-types/
│   └── shared-config/
├── docs/
├── docker-compose.yml
└── README.md
```

---

# 16. Phase 1 Re-baseline

## Keep

- Monorepo
- API
- Dashboard skeleton
- Widget skeleton
- Shared packages
- Widget-loader package
- PostgreSQL
- TypeORM migrations
- Health endpoints
- Environment validation
- Error filter
- Correlation ID
- Tests and tooling

## Change

- Make Redis optional or remove it from required readiness.
- Remove mandatory Redis environment variables.
- Remove pgvector from the MVP critical path.
- Use PostgreSQL full-text search.
- Repurpose the dashboard for internal management.
- Prioritize the widget-loader implementation.
- Update all planning documents.
- Do not proceed with the old large Phase 2 identity/multi-tenancy scope.

Do not wipe the repository. Refactor the existing foundation.

---

# 17. Revised Development Plan

## Phase A — Re-baseline foundation

- Update documents
- Make Redis optional
- Remove pgvector dependency from MVP
- Fix TypeORM migrations
- Confirm clean install, tests, lint, and builds

## Phase B — Chatbot configuration

- Chatbot entity
- Public key
- Website origin
- Allowed domain
- Welcome and fallback messages
- Internal protected CRUD
- Minimal internal dashboard

## Phase C — Crawler and Markdown generation

- Sitemap discovery
- Same-origin crawler
- HTML extraction
- Structured data extraction
- Image metadata extraction
- Cleaning
- Markdown snapshots
- Crawl jobs

## Phase D — Chunking and full-text retrieval

- Chunk generation
- Search vector
- GIN index
- Ranked search
- Confidence threshold
- Source links
- Performance tests

## Phase E — Lightweight widget

- Small loader
- Lazy iframe
- Hosted React widget
- Public config API
- Origin validation
- Text UI

## Phase F — AI grounded answering

- AI provider interface
- Website-only prompt
- Retrieved context
- Unknown fallback
- No web search
- Prompt-injection protections

## Phase G — Unanswered-question improvement

- Unknown-question recording
- Duplicate grouping
- Internal review
- Approved FAQ
- Reindex
- Future-answer verification

## Phase H — Production preparation

- Security tests
- Crawl safety tests
- Load tests
- Cross-bot isolation
- Widget-size audit
- Mobile testing
- Deployment
- Client installation guide

---

# 18. Acceptance Criteria

The MVP is complete when:

1. An internal operator creates a chatbot for a website.
2. A unique public chatbot key is generated.
3. The crawler does not leave the configured domain.
4. Useful website information is extracted.
5. Image-associated text is indexed.
6. Markdown snapshots are generated.
7. Content is chunked and indexed.
8. The client installs one script tag only.
9. The loader does not noticeably slow the website.
10. Visitors can send text questions.
11. Retrieval returns only relevant chunks.
12. AI answers only from those chunks.
13. Source links are shown.
14. Unknown information is not invented.
15. Unknown questions are stored for review.
16. Approved FAQs answer future similar questions.
17. Human requests return website contact details.
18. The client installs no backend dependency.
19. No voice or media upload is included.
20. Linting, type checking, tests, migrations, and production builds pass.
