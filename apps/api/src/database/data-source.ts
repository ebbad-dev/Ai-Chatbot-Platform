import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env for CLI migrations (NestJS isn't running during CLI migrations)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates that a required environment variable is set.
 * Fails explicitly rather than using silent defaults that could
 * connect to the wrong database in production.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        'Copy apps/api/.env.example to apps/api/.env and fill in real values.',
    );
  }
  return value;
}

/**
 * TypeORM data source configuration.
 *
 * Used by:
 *   1. NestJS TypeOrmModule (via getDataSourceOptions())
 *   2. TypeORM CLI for migrations (via default export)
 *
 * IMPORTANT: synchronize is ALWAYS false.
 * All schema changes must go through migrations.
 */
export function getDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: requireEnv('DATABASE_HOST'),
    port: parseInt(requireEnv('DATABASE_PORT'), 10),
    database: requireEnv('DATABASE_NAME'),
    username: requireEnv('DATABASE_USER'),
    password: requireEnv('DATABASE_PASSWORD'),
    ssl: (process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false,
    logging: process.env.DATABASE_LOGGING === 'true',

    // NEVER enable synchronize in any environment.
    // All schema changes go through migrations.
    synchronize: false,

    entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
    migrationsRun: true,
  };
}

// Default export for TypeORM CLI
const dataSource = new DataSource(getDataSourceOptions());
export default dataSource;
