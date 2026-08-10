import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase D Migration 1: Product tables and pg_trgm extension.
 *
 * Creates:
 * - pg_trgm extension (for trigram similarity search)
 * - product_categories table (with self-referencing parent hierarchy)
 * - products table (structured product data from API connectors)
 * - product_sync_jobs table (background sync job tracking)
 * - Full-text search index on products (name + description)
 * - Trigram index on product name for fuzzy matching
 */
export class PhaseDProducts1784300000001 implements MigrationInterface {
  name = 'PhaseDProducts1784300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pg_trgm extension for trigram similarity search
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // ─── product_categories ──────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "product_categories" (
        "id"          uuid DEFAULT uuid_generate_v4() NOT NULL,
        "chatbot_id"  uuid NOT NULL,
        "external_id" varchar(255) NOT NULL,
        "name"        varchar(512) NOT NULL,
        "slug"        varchar(512),
        "parent_id"   uuid,
        "sort_order"  integer NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_categories_chatbot" FOREIGN KEY ("chatbot_id")
          REFERENCES "chatbots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_categories_parent" FOREIGN KEY ("parent_id")
          REFERENCES "product_categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_product_categories_chatbot_external"
        ON "product_categories" ("chatbot_id", "external_id")
    `);

    // ─── products ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"                uuid DEFAULT uuid_generate_v4() NOT NULL,
        "chatbot_id"        uuid NOT NULL,
        "external_id"       varchar(255) NOT NULL,
        "name"              varchar(512) NOT NULL,
        "description"       text,
        "category_id"       uuid,
        "category_name"     varchar(512),
        "price"             decimal(12,2) NOT NULL DEFAULT 0,
        "compare_at_price"  decimal(12,2),
        "discount_percent"  decimal(5,2),
        "currency"          varchar(10) NOT NULL DEFAULT 'USD',
        "brand"             varchar(255),
        "stock_quantity"    integer,
        "stock_status"      varchar(30) NOT NULL DEFAULT 'in_stock',
        "shipping_info"     text,
        "images"            jsonb NOT NULL DEFAULT '[]',
        "product_url"       varchar(2048),
        "metadata"          jsonb,
        "sync_hash"         varchar(64),
        "last_synced_at"    TIMESTAMP,
        "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_chatbot" FOREIGN KEY ("chatbot_id")
          REFERENCES "chatbots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_products_category" FOREIGN KEY ("category_id")
          REFERENCES "product_categories"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_products_chatbot_external"
        ON "products" ("chatbot_id", "external_id")
    `);

    // Full-text search index on products (name + description)
    await queryRunner.query(`
      CREATE INDEX "IDX_products_search_fts"
        ON "products"
        USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')))
    `);

    // Trigram index on product name for fuzzy matching
    await queryRunner.query(`
      CREATE INDEX "IDX_products_name_trgm"
        ON "products"
        USING GIN (name gin_trgm_ops)
    `);

    // ─── product_sync_jobs ───────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "product_sync_jobs" (
        "id"                uuid DEFAULT uuid_generate_v4() NOT NULL,
        "chatbot_id"        uuid NOT NULL,
        "status"            varchar(50) NOT NULL DEFAULT 'pending',
        "sync_type"         varchar(30) NOT NULL DEFAULT 'full',
        "products_synced"   integer NOT NULL DEFAULT 0,
        "products_created"  integer NOT NULL DEFAULT 0,
        "products_updated"  integer NOT NULL DEFAULT 0,
        "products_failed"   integer NOT NULL DEFAULT 0,
        "error_summary"     text,
        "started_at"        TIMESTAMP,
        "completed_at"      TIMESTAMP,
        "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_sync_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_sync_jobs_chatbot" FOREIGN KEY ("chatbot_id")
          REFERENCES "chatbots"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_sync_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_categories"`);
    // Note: we don't drop pg_trgm as other things may depend on it
  }
}
