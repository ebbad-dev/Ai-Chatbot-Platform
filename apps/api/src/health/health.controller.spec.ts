import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { vi, Mock } from 'vitest';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: Partial<DataSource>;

  describe('liveness', () => {
    beforeEach(() => {
      mockDataSource = {
        query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      };
      controller = new HealthController(mockDataSource as DataSource, null);
    });

    it('should return ok status', () => {
      const result = controller.liveness();
      expect(result).toEqual(expect.objectContaining({ status: 'ok' }));
      expect(result).toHaveProperty('memoryUsage');
    });
  });

  describe('readiness with Redis disabled', () => {
    beforeEach(() => {
      mockDataSource = {
        query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      };
      // Redis is null when disabled
      controller = new HealthController(mockDataSource as DataSource, null);
    });

    it('should return ready when database is healthy and redis is disabled', async () => {
      const result = await controller.readiness();

      expect(result).toEqual({
        status: 'ready',
        dependencies: {
          database: 'ok',
          redis: 'disabled',
        },
      });
    });

    it('should return not_ready when database is down and redis is disabled', async () => {
      (mockDataSource.query as Mock).mockRejectedValue(
        new Error('Connection refused'),
      );

      const result = await controller.readiness();

      expect(result.status).toBe('not_ready');
      expect(result.dependencies.database).toBe('error');
      expect(result.dependencies.redis).toBe('disabled');
    });
  });

  describe('readiness with Redis enabled', () => {
    let mockRedis: { ping: Mock };

    beforeEach(() => {
      mockDataSource = {
        query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      };
      mockRedis = {
        ping: vi.fn().mockResolvedValue('PONG'),
      };
      controller = new HealthController(
        mockDataSource as DataSource,
        mockRedis as unknown as Redis,
      );
    });

    it('should return ready when all dependencies are healthy', async () => {
      const result = await controller.readiness();

      expect(result).toEqual({
        status: 'ready',
        dependencies: {
          database: 'ok',
          redis: 'ok',
        },
      });
    });

    it('should return not_ready when database is down', async () => {
      (mockDataSource.query as Mock).mockRejectedValue(
        new Error('Connection refused'),
      );

      const result = await controller.readiness();

      expect(result.status).toBe('not_ready');
      expect(result.dependencies.database).toBe('error');
      expect(result.dependencies.redis).toBe('ok');
    });

    it('should return not_ready when redis is down', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.readiness();

      expect(result.status).toBe('not_ready');
      expect(result.dependencies.database).toBe('ok');
      expect(result.dependencies.redis).toBe('error');
    });

    it('should return not_ready when both dependencies are down', async () => {
      (mockDataSource.query as Mock).mockRejectedValue(new Error('fail'));
      mockRedis.ping.mockRejectedValue(new Error('fail'));

      const result = await controller.readiness();

      expect(result.status).toBe('not_ready');
      expect(result.dependencies.database).toBe('error');
      expect(result.dependencies.redis).toBe('error');
    });
  });
});
