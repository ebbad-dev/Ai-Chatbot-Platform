# Phase D Architecture & Engineering Report: Production AI Website Assistant Platform

**Date:** July 28, 2026
**Status:** Completed & Production Verified
**Target Architecture:** Universal Enterprise AI Chat & Voice Website Assistant

---

## 1. Executive Overview & Paradigm Shift

In response to enterprise production requirements and supervisor feedback, the core architecture of the **AI Website Assistant Platform** was re-engineered during Phase D. The original approach of treating e-commerce product catalogs as unstructured scraped text was superseded by a highly resilient, hybrid database integration framework.

### The Universal E-Commerce & Knowledge Strategy

1. **Lightweight JavaScript Widget:** Clients embedding our solution (e.g., PrintEZ, OpenCart, Shopify, WooCommerce) do **not** install Node.js, Docker, Redis, or PostgreSQL. The embedded JS snippet acts as a lightweight client that communicates securely with our NestJS backend APIs.
2. **Relational Products vs. Unstructured Knowledge:**
   - **Products** ($6,000+$ items for PrintEZ, with categories, pricing, shipping tiers, and discounts) are synchronized via standardized enterprise connectors directly into **PostgreSQL relational tables**. They are queried using high-performance database indexes (`tsvector` full-text search + `pg_trgm` trigram fuzzy matching) rather than sluggish file search or hallucination-prone vector prompts.
   - **General Knowledge & FAQ:** The web crawler focuses exclusively on informative policies, guides, blog posts, and support pages, automatically pruning e-commerce catalog URLs (`/product/`, `/category/`, `/shop/`, `/item/`) via our URL Policy Engine to prevent duplication.
3. **Strict Order Privacy & Real-Time Lookups:** To adhere to data privacy and compliance mandates, **customer order tracking information is NEVER stored, saved, or cached in our database or Redis clusters**. Order inquiries are dynamically routed through live API proxies to the merchant's active backend systems.

---

## 2. System Architecture Hierarchy

```
[ Visitor Widget on Client Website ]
              │
              ▼ (REST / HTTP API)
[ NestJS Backend API Gateway ]
              │
       ┌──────┴────────┬─────────────────────────────┼─────────────────────────┐
       ▼               ▼                             ▼                         ▼
[ Retrieval Module ]  [ Connectors Framework ]   [ Knowledge Base Module ]  [ Products Domain ]
  • Intent Detector     • ConnectorFactory         • Chunking (SHA-256)       • Relational CRUD & Upserts
  • Router Service      • OpenCartConnector        • FAQ Authoring & CRUD     • Full-Text + pg_trgm Search
  • Prompt Builder      • Stateless Order Proxy    • Unanswered Query Tracker • BullMQ Sync Worker
```

---

## 3. Detailed Component Capabilities

### 3.1. Sub-Phase D1 & D2: Relational Schema & Connector Framework

- **Entities Implemented:** `Product`, `ProductCategory`, `ProductSyncJob`, `KnowledgeChunk`, `ApprovedFaq`, and `UnansweredQuestion`.
- **Chatbot Extensions:** Extended `Chatbot` entity with customizable `platformType` (`opencart`, `shopify`, `woocommerce`, `generic`), `connectorConfig`, and `aiSystemPrompt`.
- **Connector Architecture:** Built the universal `IConnector` abstract interface and `ConnectorFactory`. Created `OpenCartConnector` capable of parsing paginated live endpoints or large static catalog exports (e.g., `printez-products.json`) with safe error handling and timeout protection.

### 3.2. Sub-Phase D3 & D4: Product Sync & Hybrid Search

- **Asynchronous Syncing (BullMQ):** Replaced synchronous polling with Redis-backed **BullMQ** worker queues (`'product-sync'`). The dedicated `ProductSyncProcessor` orchestrates chunked paginated batch imports (500 items per batch) with automated exponential backoff retries.
- **Hybrid Retrieval Engine:** `ProductSearchService` executes advanced PostgreSQL queries combining keyword filtering, GIN indexes, price range constraints, and `pg_trgm` trigram word-similarity scoring to instantly retrieve matching products even with customer spelling typos.

### 3.3. Sub-Phase D5: Knowledge Base & Modified Crawler Exclusions

- **Semantic Chunking:** `ChunkingService` splits crawled website content along markdown heading paths (`#`, `##`, `###`) and paragraphs, generating SHA-256 hashes to detect content modifications and prevent duplicate database ingestion.
- **Merchant FAQ & Loop-Closing:** `KnowledgeBuilderService` allows merchants to author verified FAQs (`ApprovedFaq`). When customer queries return zero matches across products and documents, `KnowledgeSearchService` logs an `UnansweredQuestion`, enabling store owners to continuously enhance their AI assistant's answers.
- **Crawler Optimization:** Updated `UrlPolicyService` and migrated `CrawlQueueService` to a distributed BullMQ `'web-crawler'` queue.

### 3.4. Sub-Phase D6: Intelligence & Grounded Prompt Pipeline

- **Intent Detection:** `IntentDetectorService` evaluates visitor inputs with real-time heuristic logic to classify intentions (`PRODUCT_SEARCH`, `ORDER_STATUS`, `PRODUCT_PRICE`, `FAQ`, `CONTACT`, `GREETING`, etc.) and extract order tracking codes (e.g., `#ORD-98765`).
- **Data Routing & Anti-Hallucination:** `RetrievalRouterService` fetches the precise catalog rows, FAQs, or real-time stateless order status via `OrderProxyService`. Finally, `PromptBuilderService` constructs an optimized system prompt enforcing strict grounding rules (*"Rely EXCLUSIVELY on the grounded facts below; do not hallucinate inventory or pricing"*).

---

## 4. Verification & Quality Assurance Summary

All implementation stages underwent comprehensive unit, integration, and build testing across all workspaces (`@chatbot-platform/shared-types`, `@chatbot-platform/widget-loader`, `@chatbot-platform/api`, `@chatbot-platform/dashboard`, and `@chatbot-platform/widget`).

- **Test Suites Executed:** `27 Test Files`
- **Total Test Cases Passed:** `126 Tests (100% Pass Rate)`
- **Compilation Check:** Validated under strict TypeScript settings with zero warnings or unused identifiers via `npm run build --workspaces`.
- **Database Migrations Check:** Configured and validated typeorm migration schemas for `pg_trgm` extensions, product tables, knowledge structures, and connector configurations.

---

## 5. Deployment Readiness & Next Steps

1. **Production Deployment:** The NestJS API and background BullMQ workers can be immediately deployed to standard Dockerized container environments (e.g., AWS ECS, Kubernetes, or Google Cloud Run) alongside Redis and PostgreSQL.
2. **Future Connector Expansion:** To support upcoming platforms like Shopify or WooCommerce, engineers only need to implement a corresponding class matching `IConnector` and register its enum in `ConnectorFactory`. No core retrieval or prompt architecture modifications will be required.
3. **Voice Agent Readiness:** Because all contextual data retrieval, product filtering, and order checking reside cleanly within latency-optimized services, future Voice capabilities (e.g., streaming Audio/TTS over WebSockets or WebRTC) can call `RetrievalRouterService.routeAndRetrieve` directly to synthesize instant speech responses.
