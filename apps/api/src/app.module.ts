import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { AppConfigModule, AppConfigService } from './config';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { getDataSourceOptions } from './database/data-source';
import { ChatbotsModule } from './chatbots/chatbots.module';
import { CrawlerModule } from './crawler/crawler.module';
import { ProductsModule } from './products/products.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { OrdersModule } from './orders/orders.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { AiModule } from './ai/ai.module';
import { EmbeddingModule } from './ai/embedding.module';

/**
 * Root application module.
 *
 * Includes Phase D & Phase F production architecture modules:
 * - PostgreSQL TypeORM connection & Redis / BullMQ async queuing
 * - Domain Modules: Chatbots, Crawler, Products (Connector Sync), Knowledge, Retrieval, AI
 */
@Module({
  imports: [
    // Global configuration — validates env vars
    AppConfigModule,

    // Rate Limiting (100 req per min) backed by Redis
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            ttl: 60000,
            limit: 100,
          }
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.redisHost,
            port: config.redisPort,
            password: config.redisPassword || undefined,
            db: config.redisDb,
          })
        ),
      }),
    }),

    // PostgreSQL — synchronize is always false
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (_config: AppConfigService) => ({
        ...getDataSourceOptions(),
      }),
    }),

    // Redis client provider
    RedisModule.register(),

    // BullMQ background job processing queue root configuration
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword || undefined,
          db: config.redisDb,
          maxRetriesPerRequest: null, // Required by BullMQ workers
        },
      }),
    }),

    // Health checks
    HealthModule,

    // Domain Modules
    ChatbotsModule,
    CrawlerModule,
    ProductsModule,
    KnowledgeModule,
    OrdersModule,
    RetrievalModule,
    AiModule,
    EmbeddingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
