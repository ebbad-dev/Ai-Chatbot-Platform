# Database Schema

> Revised to match the updated PRD. Based on PostgreSQL 16 with full-text search.
> pgvector is deferred. Multi-tenant auth tables are deferred.

---

## Overview

The database uses PostgreSQL 16 with the `uuid-ossp` extension for UUID generation. All tables use UUID primary keys. Schema changes are managed through TypeORM migrations (`synchronize: false`).

Data is scoped by `chatbot_id` to support multiple configured chatbots on the same platform.

---

## Core Tables

### `chatbots`

Central configuration for each chatbot instance.

| Column             | Type         | Constraints                    | Description                                     |
| ------------------ | ------------ | ------------------------------ | ----------------------------------------------- |
| `id`               | UUID         | PK, DEFAULT uuid_generate_v4() |                                                 |
| `public_key`       | VARCHAR(64)  | UNIQUE, NOT NULL               | Public key for widget (e.g., `bot_pub_abc123`)  |
| `name`             | VARCHAR(255) | NOT NULL                       | Display name                                    |
| `website_origin`   | VARCHAR(512) | NOT NULL                       | Authorized origin (e.g., `https://example.com`) |
| `welcome_message`  | TEXT         | NOT NULL                       | First message shown to visitors                 |
| `fallback_message` | TEXT         | NOT NULL                       | Message when answer is not found                |
| `status`           | VARCHAR(20)  | NOT NULL, DEFAULT 'draft'      | draft, active, inactive, archived               |
| `crawl_page_limit` | INTEGER      | DEFAULT 500                    | Max pages per crawl                             |
| `crawl_depth`      | INTEGER      | DEFAULT 5                      | Max link depth                                  |
| `last_indexed_at`  | TIMESTAMP    | NULLABLE                       | Last successful index time                      |
| `created_at`       | TIMESTAMP    | NOT NULL, DEFAULT NOW()        |                                                 |
| `updated_at`       | TIMESTAMP    | NOT NULL, DEFAULT NOW()        |                                                 |

### `allowed_domains`

Domains authorized to embed the chatbot widget.

| Column       | Type         | Constraints                | Description         |
| ------------ | ------------ | -------------------------- | ------------------- |
| `id`         | UUID         | PK                         |                     |
| `chatbot_id` | UUID         | FK → chatbots.id, NOT NULL |                     |
| `domain`     | VARCHAR(512) | NOT NULL                   | e.g., `example.com` |
| `status`     | VARCHAR(20)  | NOT NULL, DEFAULT 'active' | active, inactive    |
| `created_at` | TIMESTAMP    | NOT NULL, DEFAULT NOW()    |                     |

**Index:** `(chatbot_id, domain)` UNIQUE

### `crawl_jobs`

Tracks website crawl operations.

| Column             | Type        | Constraints                 | Description                         |
| ------------------ | ----------- | --------------------------- | ----------------------------------- |
| `id`               | UUID        | PK                          |                                     |
| `chatbot_id`       | UUID        | FK → chatbots.id, NOT NULL  |                                     |
| `status`           | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | pending, running, completed, failed |
| `pages_discovered` | INTEGER     | DEFAULT 0                   |                                     |
| `pages_processed`  | INTEGER     | DEFAULT 0                   |                                     |
| `pages_failed`     | INTEGER     | DEFAULT 0                   |                                     |
| `started_at`       | TIMESTAMP   | NULLABLE                    |                                     |
| `completed_at`     | TIMESTAMP   | NULLABLE                    |                                     |
| `error_summary`    | TEXT        | NULLABLE                    |                                     |

**Index:** `(chatbot_id, status)`

### `website_pages`

Individual pages discovered and crawled.

| Column             | Type          | Constraints                | Description                      |
| ------------------ | ------------- | -------------------------- | -------------------------------- |
| `id`               | UUID          | PK                         |                                  |
| `chatbot_id`       | UUID          | FK → chatbots.id, NOT NULL |                                  |
| `url`              | VARCHAR(2048) | NOT NULL                   | Original URL                     |
| `canonical_url`    | VARCHAR(2048) | NULLABLE                   | Canonical version                |
| `title`            | VARCHAR(512)  | NULLABLE                   | Page title                       |
| `markdown_content` | TEXT          | NULLABLE                   | Generated Markdown snapshot      |
| `content_hash`     | VARCHAR(64)   | NULLABLE                   | SHA-256 for change detection     |
| `http_status`      | INTEGER       | NULLABLE                   | Last HTTP status code            |
| `last_crawled_at`  | TIMESTAMP     | NULLABLE                   |                                  |
| `index_status`     | VARCHAR(20)   | DEFAULT 'pending'          | pending, indexed, error, skipped |

**Index:** `(chatbot_id, url)` UNIQUE

### `knowledge_chunks`

Searchable content chunks with full-text search support.

| Column          | Type          | Constraints                     | Description                     |
| --------------- | ------------- | ------------------------------- | ------------------------------- |
| `id`            | UUID          | PK                              |                                 |
| `chatbot_id`    | UUID          | FK → chatbots.id, NOT NULL      |                                 |
| `page_id`       | UUID          | FK → website_pages.id, NOT NULL |                                 |
| `page_url`      | VARCHAR(2048) | NOT NULL                        | Denormalized for response speed |
| `page_title`    | VARCHAR(512)  | NULLABLE                        | Denormalized                    |
| `heading_path`  | TEXT          | NULLABLE                        | e.g., "Products > Pricing"      |
| `content`       | TEXT          | NOT NULL                        | Chunk text content              |
| `search_vector` | TSVECTOR      | NOT NULL                        | Full-text search column         |
| `chunk_order`   | INTEGER       | NOT NULL                        | Position within page            |
| `content_hash`  | VARCHAR(64)   | NOT NULL                        | For deduplication               |
| `created_at`    | TIMESTAMP     | NOT NULL, DEFAULT NOW()         |                                 |
| `updated_at`    | TIMESTAMP     | NOT NULL, DEFAULT NOW()         |                                 |

**Indexes:**

- `search_vector` GIN index (for full-text search)
- `(chatbot_id)` for scoped queries

### `contact_records`

Contact information extracted from websites.

| Column       | Type          | Constraints                | Description                |
| ------------ | ------------- | -------------------------- | -------------------------- |
| `id`         | UUID          | PK                         |                            |
| `chatbot_id` | UUID          | FK → chatbots.id, NOT NULL |                            |
| `type`       | VARCHAR(20)   | NOT NULL                   | email, phone, contact_page |
| `value`      | VARCHAR(512)  | NOT NULL                   | The contact value          |
| `source_url` | VARCHAR(2048) | NULLABLE                   | Page where found           |
| `priority`   | INTEGER       | DEFAULT 0                  | Higher = more prominent    |
| `verified`   | BOOLEAN       | DEFAULT false              | Manually verified          |
| `updated_at` | TIMESTAMP     | NOT NULL, DEFAULT NOW()    |                            |

**Index:** `(chatbot_id, type)`

### `unanswered_questions`

Questions the chatbot could not answer.

| Column                | Type          | Constraints                | Description                                            |
| --------------------- | ------------- | -------------------------- | ------------------------------------------------------ |
| `id`                  | UUID          | PK                         |                                                        |
| `chatbot_id`          | UUID          | FK → chatbots.id, NOT NULL |                                                        |
| `normalized_question` | TEXT          | NOT NULL                   | Cleaned/normalized question                            |
| `example_question`    | TEXT          | NOT NULL                   | Original visitor question                              |
| `occurrence_count`    | INTEGER       | DEFAULT 1                  | Times asked                                            |
| `first_seen_at`       | TIMESTAMP     | NOT NULL                   |                                                        |
| `last_seen_at`        | TIMESTAMP     | NOT NULL                   |                                                        |
| `status`              | VARCHAR(20)   | DEFAULT 'new'              | new, reviewed, resolved, out_of_scope                  |
| `resolution_type`     | VARCHAR(20)   | NULLABLE                   | linked_page, approved_faq, client_action, out_of_scope |
| `resolved_source_url` | VARCHAR(2048) | NULLABLE                   | If linked to existing page                             |
| `resolved_faq_id`     | UUID          | NULLABLE                   | FK → approved_faqs.id                                  |

**Index:** `(chatbot_id, status)`

### `approved_faqs`

Manually approved FAQ entries that become searchable knowledge.

| Column        | Type          | Constraints                | Description             |
| ------------- | ------------- | -------------------------- | ----------------------- |
| `id`          | UUID          | PK                         |                         |
| `chatbot_id`  | UUID          | FK → chatbots.id, NOT NULL |                         |
| `question`    | TEXT          | NOT NULL                   |                         |
| `answer`      | TEXT          | NOT NULL                   |                         |
| `source_url`  | VARCHAR(2048) | NULLABLE                   | Reference URL           |
| `status`      | VARCHAR(20)   | DEFAULT 'draft'            | draft, active, archived |
| `approved_by` | VARCHAR(255)  | NULLABLE                   | Operator identifier     |
| `approved_at` | TIMESTAMP     | NULLABLE                   |                         |
| `created_at`  | TIMESTAMP     | NOT NULL, DEFAULT NOW()    |                         |
| `updated_at`  | TIMESTAMP     | NOT NULL, DEFAULT NOW()    |                         |

**Index:** `(chatbot_id, status)`

---

## Deferred Tables

The following tables from the older architecture are **not included** in the MVP:

| Table                                  | Reason                                                |
| -------------------------------------- | ----------------------------------------------------- |
| `organizations`                        | Multi-tenancy deferred                                |
| `users`                                | Auth system deferred                                  |
| `user_roles`                           | Auth system deferred                                  |
| `invitations`                          | Auth system deferred                                  |
| `refresh_tokens`                       | Auth system deferred                                  |
| `sessions`                             | Redis sessions deferred; browser-side context for MVP |
| `conversations`                        | Full conversation storage deferred                    |
| `messages`                             | Full message persistence deferred                     |
| `support_requests` / `handoffs`        | Live agent transfer deferred                          |
| `document_chunks` (with vector column) | pgvector deferred                                     |

---

## Migration Strategy

- All schema changes use TypeORM migrations
- `synchronize` is always `false`
- Migration CLI: `typeorm-ts-node-commonjs`
- Existing migration: `1720000000001` — enables `uuid-ossp` extension only
- Future migrations create tables as each phase is implemented
- Migrations must work on standard PostgreSQL 16 (no pgvector required)
