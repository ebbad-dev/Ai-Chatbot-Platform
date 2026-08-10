# System Architecture

> Revised to match the updated PRD. Describes a hosted website chatbot, not a multi-tenant SaaS platform.

---

## Architecture Overview

The AI Chatbot Platform is a hosted service that provides website-embeddable chatbots. The architecture consists of:

```
┌─────────────────────────────────────────────────────┐
│                    Client Website                    │
│  ┌─────────────────────────────────────────────┐    │
│  │  <script src="widget-loader.js"              │    │
│  │          data-chatbot-key="bot_pub_xxx">     │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │ Creates iframe                 │
│  ┌──────────────────▼──────────────────────────┐    │
│  │           Hosted Widget (iframe)             │    │
│  │     React chatbot UI served from our CDN     │    │
│  └──────────────────┬──────────────────────────┘    │
└─────────────────────┼───────────────────────────────┘
                      │ HTTPS API calls
┌─────────────────────▼───────────────────────────────┐
│              Hosted Backend (Our Servers)             │
│  ┌─────────────────────────────────────────────┐    │
│  │              NestJS API Server               │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ Public   │ │ Internal │ │ Health   │    │    │
│  │  │ Chat API │ │ Mgmt API │ │ Checks   │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ Crawler  │ │ Indexer  │ │ AI       │    │    │
│  │  │ Service  │ │ Service  │ │ Service  │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘    │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                                │
│  ┌──────────────────▼──────────────────────────┐    │
│  │          PostgreSQL 16                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ Chatbots │ │ Pages    │ │ Chunks   │    │    │
│  │  │ Domains  │ │ Contacts │ │ FAQs     │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘    │    │
│  │  Full-text search: tsvector + GIN index      │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │          Redis (Optional, future)            │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Client Installation: One Script Tag

The client adds only:

```html
<script
  async
  src="https://chatbot.example.com/widget-loader.js"
  data-chatbot-key="bot_pub_abc123"
></script>
```

No Docker, Redis, PostgreSQL, Node.js, npm packages, or backend code.

### 2. Widget Isolation: iframe

The chatbot UI runs inside a hosted iframe, providing:

- Complete CSS isolation from the host website
- Security boundary (no access to host DOM)
- Independent updates without client involvement
- Mobile-responsive layout

### 3. Retrieval: PostgreSQL Full-Text Search

The MVP uses PostgreSQL `tsvector` columns with GIN indexes:

- Simple to operate (no additional services)
- Fast indexed search
- Avoids AI embedding costs during early development
- Sufficient for single-website knowledge bases

pgvector semantic search is deferred to a future phase.

### 4. Redis: Optional

Redis is disabled by default (`REDIS_ENABLED=false`):

- MVP sessions use short-lived signed tokens
- Conversation context is kept in the browser
- In-process memory cache for bot configuration
- Redis can be enabled later for distributed sessions/caching

### 5. No Open-Web Search

The chatbot only answers from crawled website content. It never searches the broader internet, ensuring answers are always grounded in the client's actual website.

---

## Application Components

### Widget Loader (`packages/widget-loader`)

- Vanilla TypeScript compiled to JavaScript
- Reads public chatbot key from script data attribute
- Creates a launcher icon on the page
- Lazy-loads a hosted iframe when clicked
- Target: under 20KB gzipped
- No React, no AI SDK, no secrets

### Widget (`apps/widget`)

- React application served from our CDN
- Runs inside the loader-created iframe
- Text input, message list, typing indicators
- Source links and contact fallback display
- Communicates with API via HTTPS

### Dashboard (`apps/dashboard`)

- React internal management interface
- Used by platform operators (not end clients)
- Chatbot configuration, crawl management
- Unanswered question review, FAQ approval
- Not exposed to website visitors

### API (`apps/api`)

- NestJS with TypeORM
- Public endpoints: chatbot config, session, messages
- Internal endpoints: chatbot CRUD, crawl, pages, FAQs
- Correlation ID tracing on all requests
- Global exception filter with structured error responses
- Health and readiness checks

### Database

- PostgreSQL 16 (standard, no extensions required for MVP except uuid-ossp)
- TypeORM with explicit migrations (synchronize = false)
- Full-text search via tsvector + GIN index
- Data scoped by chatbot_id

---

## Data Flow: Chat Message

```
1. Visitor types question in widget
2. Widget sends POST /api/public/chatbots/{key}/messages
3. API validates origin against allowed_domains
4. API searches knowledge_chunks using full-text search
5. Top relevant chunks are retrieved (scoped to chatbot_id)
6. If confidence is sufficient:
   a. Chunks are provided to AI model as context
   b. AI generates answer grounded only in those chunks
   c. Response includes source page links
7. If confidence is insufficient:
   a. Fallback message is returned
   b. Contact information is included
   c. Question is recorded as unanswered
8. Response is sent to widget
```

---

## Deferred Architecture Elements

| Feature                  | Reason for Deferral                     |
| ------------------------ | --------------------------------------- |
| pgvector semantic search | PostgreSQL FTS sufficient for MVP       |
| Redis sessions           | Browser-side context sufficient for MVP |
| Multi-tenant auth        | Internal-only management for MVP        |
| Live agent transfer      | Contact fallback sufficient for MVP     |
| Voice features           | Text-only for MVP                       |
| File uploads             | Text-only for MVP                       |
| Multiple AI providers    | Single provider for MVP                 |
| Advanced analytics       | Basic logging sufficient for MVP        |
