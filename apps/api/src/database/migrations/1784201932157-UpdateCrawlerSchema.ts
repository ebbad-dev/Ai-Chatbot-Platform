import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCrawlerSchema1784201932157 implements MigrationInterface {
    name = 'UpdateCrawlerSchema1784201932157'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "website_pages" DROP CONSTRAINT "FK_0ae284c513fd27ee57b01303c2d"`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP COLUMN "crawl_job_id"`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD "processing_status" character varying(50) NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD "requires_rendering" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD "first_seen_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD "last_seen_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD "last_crawl_job_id" uuid`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_38a7c4cca488b1ecdc2e9440c4" ON "contact_records" ("chatbot_id", "type", "normalized_value") `);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD CONSTRAINT "FK_7493c73294d4c6b4c07c0fbcba5" FOREIGN KEY ("last_crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "website_pages" DROP CONSTRAINT "FK_7493c73294d4c6b4c07c0fbcba5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38a7c4cca488b1ecdc2e9440c4"`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP COLUMN "last_crawl_job_id"`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP COLUMN "last_seen_at"`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP COLUMN "first_seen_at"`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP COLUMN "requires_rendering"`);
        await queryRunner.query(`ALTER TABLE "website_pages" DROP COLUMN "processing_status"`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD "crawl_job_id" uuid`);
        await queryRunner.query(`ALTER TABLE "website_pages" ADD CONSTRAINT "FK_0ae284c513fd27ee57b01303c2d" FOREIGN KEY ("crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
