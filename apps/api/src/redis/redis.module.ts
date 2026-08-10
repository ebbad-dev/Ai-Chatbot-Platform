import { Global, Module, Logger, DynamicModule } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config';

/**
 * Redis module.
 *
 * Provides a global ioredis client instance when Redis is enabled.
 * When REDIS_ENABLED is false (the default), provides null as the
 * REDIS_CLIENT token so dependent modules can use @Optional().
 *
 * Injected via @Inject('REDIS_CLIENT') throughout the application.
 */
@Global()
@Module({})
export class RedisModule {
  static register(): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useFactory: (config: AppConfigService): Redis | null => {
            if (!config.redisEnabled) {
              const logger = new Logger('RedisModule');
              logger.log('Redis is disabled (REDIS_ENABLED != true). Skipping connection.');
              return null;
            }

            const logger = new Logger('RedisModule');

            const client = new Redis({
              host: config.redisHost,
              port: config.redisPort,
              password: config.redisPassword || undefined,
              db: config.redisDb,
              retryStrategy: (times: number) => {
                if (times > 10) {
                  logger.error('Redis: max retry attempts reached');
                  return null; // Stop retrying
                }
                return Math.min(times * 200, 3000);
              },
              maxRetriesPerRequest: 3,
              lazyConnect: false,
            });

            client.on('connect', () => {
              logger.log('Redis connected');
            });

            client.on('error', (err: Error) => {
              logger.error(`Redis error: ${err.message}`);
            });

            client.on('close', () => {
              logger.warn('Redis connection closed');
            });

            return client;
          },
          inject: [AppConfigService],
        },
      ],
      exports: ['REDIS_CLIENT'],
    };
  }
}
