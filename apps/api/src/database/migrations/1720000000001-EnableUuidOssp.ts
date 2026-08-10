import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Enable uuid-ossp extension.
 *
 * Provides UUID generation functions for PostgreSQL.
 * This runs on standard PostgreSQL 16 — pgvector is NOT required for the MVP.
 *
 * pgvector (CREATE EXTENSION vector) was originally included here but has been
 * removed from the MVP critical path per the revised PRD. PostgreSQL full-text
 * search (tsvector + GIN index) will be used for the initial retrieval layer.
 * pgvector can be re-added in a future migration when semantic search is needed.
 */
export class EnableExtensions1720000000001 implements MigrationInterface {
  name = 'EnableExtensions1720000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  }
}
