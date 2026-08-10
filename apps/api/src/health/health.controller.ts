import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type Redis from 'ioredis';

/**
 * Health check controller.
 *
 * Provides liveness and readiness endpoints for infrastructure monitoring.
 * These endpoints are public (no authentication required).
 *
 * Redis is optional — when disabled, it is reported as 'disabled'
 * rather than 'error', and readiness is based on database only.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() @Inject('REDIS_CLIENT') private readonly redis: Redis | null,
  ) {}

  /**
   * GET /api/v1/health
   *
   * Basic liveness check — confirms the API process is running.
   */
  @Get()
  liveness(): { status: string; memoryUsage: NodeJS.MemoryUsage } {
    return { status: 'ok', memoryUsage: process.memoryUsage() };
  }

  /**
   * GET /api/v1/health/ready
   *
   * Readiness check — verifies database connectivity and optional Redis.
   * Returns dependency status for each service.
   */
  @Get('ready')
  async readiness(): Promise<{
    status: string;
    dependencies: {
      database: string;
      redis: string;
    };
  }> {
    const database = await this.checkDatabase();
    const redis = this.redis ? await this.checkRedis() : 'disabled';

    // Readiness is based on required dependencies only (database)
    // Redis is optional for the MVP
    const allOk = database === 'ok' && (redis === 'ok' || redis === 'disabled');

    return {
      status: allOk ? 'ready' : 'not_ready',
      dependencies: {
        database,
        redis,
      },
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      if (!this.redis) return 'disabled';
      const result = await this.redis.ping();
      return result === 'PONG' ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }
}
