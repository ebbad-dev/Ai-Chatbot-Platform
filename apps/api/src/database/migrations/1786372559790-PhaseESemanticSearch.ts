import { MigrationInterface, QueryRunner } from "typeorm";

export class PhaseESemanticSearch1786372559790 implements MigrationInterface {
    name = 'PhaseESemanticSearch1786372559790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_categories" DROP CONSTRAINT "FK_product_categories_chatbot"`);
        await queryRunner.query(`ALTER TABLE "product_categories" DROP CONSTRAINT "FK_product_categories_parent"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_chatbot"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_category"`);
        await queryRunner.query(`ALTER TABLE "product_sync_jobs" DROP CONSTRAINT "FK_product_sync_jobs_chatbot"`);
        await queryRunner.query(`ALTER TABLE "approved_faqs" DROP CONSTRAINT "FK_approved_faqs_chatbot"`);
        await queryRunner.query(`ALTER TABLE "unanswered_questions" DROP CONSTRAINT "FK_unanswered_questions_chatbot"`);
        await queryRunner.query(`ALTER TABLE "unanswered_questions" DROP CONSTRAINT "FK_unanswered_questions_faq"`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_knowledge_chunks_chatbot"`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_knowledge_chunks_page"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_categories_chatbot_external"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_products_chatbot_external"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_products_name_trgm"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_knowledge_chunks_chatbot_hash"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_knowledge_chunks_search"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "embedding" double precision array`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6f981007f80d651013dccbdd7c" ON "product_categories" ("chatbot_id", "external_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_23736daf939318f565acf84046" ON "products" ("chatbot_id", "external_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1ffe44e6c819532175b3bdd3d1" ON "knowledge_chunks" ("chatbot_id", "content_hash") `);
        await queryRunner.query(`ALTER TABLE "product_categories" ADD CONSTRAINT "FK_86ead364df244068ceaa57ef82c" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_categories" ADD CONSTRAINT "FK_5f151d414daab0290f65b517ed4" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_36a7d9db2f674559b725540455e" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_sync_jobs" ADD CONSTRAINT "FK_58557289c1fa449c59531c72f8c" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "approved_faqs" ADD CONSTRAINT "FK_0ff6fa32c7b6e9f822d6df5ef1c" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "unanswered_questions" ADD CONSTRAINT "FK_e75c0c80a46f7b8800699ce036b" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "unanswered_questions" ADD CONSTRAINT "FK_441faa443252047ee81f0fa85e8" FOREIGN KEY ("resolved_faq_id") REFERENCES "approved_faqs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_d14bbf164983ab074f32c76038a" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_06bce2b6a7e3cee9e850fd10836" FOREIGN KEY ("source_page_id") REFERENCES "website_pages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_06bce2b6a7e3cee9e850fd10836"`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_d14bbf164983ab074f32c76038a"`);
        await queryRunner.query(`ALTER TABLE "unanswered_questions" DROP CONSTRAINT "FK_441faa443252047ee81f0fa85e8"`);
        await queryRunner.query(`ALTER TABLE "unanswered_questions" DROP CONSTRAINT "FK_e75c0c80a46f7b8800699ce036b"`);
        await queryRunner.query(`ALTER TABLE "approved_faqs" DROP CONSTRAINT "FK_0ff6fa32c7b6e9f822d6df5ef1c"`);
        await queryRunner.query(`ALTER TABLE "product_sync_jobs" DROP CONSTRAINT "FK_58557289c1fa449c59531c72f8c"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_36a7d9db2f674559b725540455e"`);
        await queryRunner.query(`ALTER TABLE "product_categories" DROP CONSTRAINT "FK_5f151d414daab0290f65b517ed4"`);
        await queryRunner.query(`ALTER TABLE "product_categories" DROP CONSTRAINT "FK_86ead364df244068ceaa57ef82c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ffe44e6c819532175b3bdd3d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23736daf939318f565acf84046"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6f981007f80d651013dccbdd7c"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "embedding"`);
        await queryRunner.query(`CREATE INDEX "IDX_knowledge_chunks_search" ON "knowledge_chunks" ("search_vector") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_knowledge_chunks_chatbot_hash" ON "knowledge_chunks" ("chatbot_id", "content_hash") `);
        await queryRunner.query(`CREATE INDEX "IDX_products_name_trgm" ON "products" ("name") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_products_chatbot_external" ON "products" ("chatbot_id", "external_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_product_categories_chatbot_external" ON "product_categories" ("chatbot_id", "external_id") `);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_knowledge_chunks_page" FOREIGN KEY ("source_page_id") REFERENCES "website_pages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_knowledge_chunks_chatbot" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "unanswered_questions" ADD CONSTRAINT "FK_unanswered_questions_faq" FOREIGN KEY ("resolved_faq_id") REFERENCES "approved_faqs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "unanswered_questions" ADD CONSTRAINT "FK_unanswered_questions_chatbot" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "approved_faqs" ADD CONSTRAINT "FK_approved_faqs_chatbot" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_sync_jobs" ADD CONSTRAINT "FK_product_sync_jobs_chatbot" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_products_category" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_products_chatbot" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_categories" ADD CONSTRAINT "FK_product_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_categories" ADD CONSTRAINT "FK_product_categories_chatbot" FOREIGN KEY ("chatbot_id") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
