import { MigrationInterface, QueryRunner } from "typeorm";

export class PhaseCCrawler1784199783253 implements MigrationInterface {
    name = 'PhaseCCrawler1784199783253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "crawl_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chatbot_id" uuid NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'pending', "pages_discovered" integer NOT NULL DEFAULT '0', "pages_processed" integer NOT NULL DEFAULT '0', "pages_failed" integer NOT NULL DEFAULT '0', "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "error_summary" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_494073b3def5d2631d063c78828" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "website_pages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chatbot_id" uuid NOT NULL, "url" character varying(2048) NOT NULL, "canonical_url" character varying(2048) NOT NULL, "title" character varying(1024), "meta_description" text, "markdown_content" text, "content_hash" character varying(255), "http_status" integer, "content_type" character varying(255), "last_crawled_at" TIMESTAMP, "index_status" character varying(50) NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "crawl_job_id" uuid, CONSTRAINT "PK_2605f6f433ce6dc188288ae4b03" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7e88d01a59f76c608d3cdc9047" ON "website_pages" ("chatbot_id", "canonical_url") `);
        await queryRunner.query(`CREATE TABLE "contact_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chatbot_id" uuid NOT NULL, "type" character varying(50) NOT NULL, "value" character varying(1024) NOT NULL, "normalized_value" character varying(1024) NOT NULL, "source_url" character varying(2048), "priority" integer NOT NULL DEFAULT '0', "verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dca06de072bb248713bfb05b749" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "crawl_jobs" ADD CONSTRAINT "FK_609e52f8d92dc1c64abb2813974" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD CONSTRAINT "FK_da46e4d549c41150bb529b938af" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD CONSTRAINT "FK_0ae284c513fd27ee57b01303c2d" FOREIGN KEY ("crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contact_records" ADD CONSTRAINT "FK_0883908a08ab0cc454c2c3f0ec3" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contact_records" DROP CONSTRAINT "FK_0883908a08ab0cc454c2c3f0ec3"`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP CONSTRAINT "FK_0ae284c513fd27ee57b01303c2d"`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP CONSTRAINT "FK_da46e4d549c41150bb529b938af"`);
        await queryRunner.query(`ALTER TABLE "crawl_jobs" DROP CONSTRAINT "FK_609e52f8d92dc1c64abb2813974"`);
        await queryRunner.query(`DROP TABLE "contact_records"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e88d01a59f76c608d3cdc9047"`);
        await queryRunner.query(`DROP TABLE "website_pages"`);
        await queryRunner.query(`DROP TABLE "crawl_jobs"`);
    }

}
