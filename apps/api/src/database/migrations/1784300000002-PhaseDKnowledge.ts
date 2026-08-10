import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase D Migration 2: Knowledge base tables.
 *
 * Creates:
 * - knowledge_chunks table (static content — FAQ, about, policies from crawler + owner input)
 * - approved_faqs table (owner-approved Q&A pairs)
 * - unanswered_questions table (questions the chatbot couldn't answer)
 * - GIN index on knowledge_chunks.search_vector for full-text search
 * - Trigger to auto-populate search_vector on INSERT/UPDATE
 */
export class PhaseDKnowledge1784300000002 implements MigrationInterface {
  name = 'PhaseDKnowledge1784300000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── knowledge_chunks ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "knowledge_chunks" (
        "id"              uuid DEFAULT uuid_generate_v4() NOT NULL,
        "chatbot_id"      uuid NOT NULL,
        "source_page_id"  uuid,
        "source_type"     varchar(30) NOT NULL DEFAULT 'crawl',
        "source_url"      varchar(2048),
        "page_title"      varchar(1024),
        "heading_path"    varchar(1024),
        "content"         text NOT NULL,
        "search_vector"   tsvector,
        "content_hash"    varchar(64) NOT NULL,
        "chunk_order"     integer NOT NULL DEFAULT 0,
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_knowledge_chunks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_knowledge_chunks_chatbot" FOREIGN KEY ("chatbot_id")
          REFERENCES "chatbots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_knowledge_chunks_page" FOREIGN KEY ("source_page_id")
          REFERENCES "website_pages"("id") ON DELETE SET NULL
      )
    `);

    // Unique constraint: prevent duplicate chunks per chatbot
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_knowledge_chunks_chatbot_hash"
        ON "knowledge_chunks" ("chatbot_id", "content_hash")
    `);

    // GIN index on search_vector for fast full-text search
    await queryRunner.query(`
      CREATE INDEX "IDX_knowledge_chunks_search"
        ON "knowledge_chunks"
        USING GIN ("search_vector")
    `);

    // Trigger: auto-populate search_vector on INSERT or UPDATE
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION knowledge_chunks_search_vector_trigger()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.page_title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.heading_path, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER knowledge_chunks_search_update
        BEFORE INSERT OR UPDATE ON "knowledge_chunks"
        FOR EACH ROW
        EXECUTE FUNCTION knowledge_chunks_search_vector_trigger()
    `);

    // ─── approved_faqs ───────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "approved_faqs" (
        "id"          uuid DEFAULT uuid_generate_v4() NOT NULL,
        "chatbot_id"  uuid NOT NULL,
        "question"    text NOT NULL,
        "answer"      text NOT NULL,
        "source_url"  varchar(2048),
        "status"      varchar(20) NOT NULL DEFAULT 'draft',
        "approved_by" varchar(255),
        "approved_at" TIMESTAMP,
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approved_faqs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_approved_faqs_chatbot" FOREIGN KEY ("chatbot_id")
          REFERENCES "chatbots"("id") ON DELETE CASCADE
      )
    `);

    // ─── unanswered_questions ────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "unanswered_questions" (
        "id"                    uuid DEFAULT uuid_generate_v4() NOT NULL,
        "chatbot_id"            uuid NOT NULL,
        "normalized_question"   text NOT NULL,
        "example_question"      text NOT NULL,
        "occurrence_count"      integer NOT NULL DEFAULT 1,
        "status"                varchar(30) NOT NULL DEFAULT 'new',
        "resolution_type"       varchar(30),
        "resolved_source_url"   varchar(2048),
        "resolved_faq_id"       uuid,
        "first_seen_at"         TIMESTAMP NOT NULL,
        "last_seen_at"          TIMESTAMP NOT NULL,
        "created_at"            TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_unanswered_questions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_unanswered_questions_chatbot" FOREIGN KEY ("chatbot_id")
          REFERENCES "chatbots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_unanswered_questions_faq" FOREIGN KEY ("resolved_faq_id")
          REFERENCES "approved_faqs"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "unanswered_questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "approved_faqs"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS knowledge_chunks_search_update ON "knowledge_chunks"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS knowledge_chunks_search_vector_trigger()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_chunks"`);
  }
}
