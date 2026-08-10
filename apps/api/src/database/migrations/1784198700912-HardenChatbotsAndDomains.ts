import { MigrationInterface, QueryRunner } from "typeorm";

export class HardenChatbotsAndDomains1784198700912 implements MigrationInterface {
    name = 'HardenChatbotsAndDomains1784198700912'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chatbots" ALTER COLUMN "public_key" TYPE character varying(96)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chatbots" ALTER COLUMN "public_key" TYPE character varying(64)`);
    }

}
