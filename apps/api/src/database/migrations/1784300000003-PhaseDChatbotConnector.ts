import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase D Migration 3: Add connector and AI fields to chatbots table.
 *
 * Adds:
 * - platform_type: identifies the e-commerce platform (opencart, shopify, etc.)
 * - connector_config: JSONB for platform-specific API credentials and settings
 * - crawl_allow_patterns: JSONB array of URL patterns the crawler should visit
 * - ai_system_prompt: optional custom system prompt per chatbot
 */
export class PhaseDChatbotConnector1784300000003 implements MigrationInterface {
  name = 'PhaseDChatbotConnector1784300000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chatbots"
        ADD COLUMN "platform_type" varchar(50) NOT NULL DEFAULT 'generic'
    `);

    await queryRunner.query(`
      ALTER TABLE "chatbots"
        ADD COLUMN "connector_config" jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "chatbots"
        ADD COLUMN "crawl_allow_patterns" jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "chatbots"
        ADD COLUMN "ai_system_prompt" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "ai_system_prompt"`);
    await queryRunner.query(`ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "crawl_allow_patterns"`);
    await queryRunner.query(`ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "connector_config"`);
    await queryRunner.query(`ALTER TABLE "chatbots" DROP COLUMN IF EXISTS "platform_type"`);
  }
}
