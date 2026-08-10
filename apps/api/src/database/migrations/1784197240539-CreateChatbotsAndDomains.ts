import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatbotsAndDomains1784197240539 implements MigrationInterface {
    name = 'CreateChatbotsAndDomains1784197240539'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "allowed_domains" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "domain" character varying(512) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "chatbot_id" uuid, CONSTRAINT "PK_057c3cdafb278ba2d5a3d961be8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_33f729ea9c133a938aa592247d" ON "allowed_domains" ("chatbot_id", "domain") `);
        await queryRunner.query(`CREATE TABLE "chatbots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "public_key" character varying(64) NOT NULL, "name" character varying(255) NOT NULL, "website_origin" character varying(512) NOT NULL, "welcome_message" text NOT NULL, "fallback_message" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'draft', "crawl_page_limit" integer NOT NULL DEFAULT '500', "crawl_depth" integer NOT NULL DEFAULT '5', "last_indexed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0d9247361a0b0b5d189377df753" UNIQUE ("public_key"), CONSTRAINT "PK_ec8923205b2059dbc8dfb6ef8e5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "allowed_domains" ADD CONSTRAINT "FK_fa4f690159bfbed1dc07380d491" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "allowed_domains" DROP CONSTRAINT "FK_fa4f690159bfbed1dc07380d491"`);
        await queryRunner.query(`DROP TABLE "chatbots"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_33f729ea9c133a938aa592247d"`);
        await queryRunner.query(`DROP TABLE "allowed_domains"`);
    }

}
