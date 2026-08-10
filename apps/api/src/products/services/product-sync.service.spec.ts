import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductSyncService } from './product-sync.service';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { ProductSyncJob } from '../entities/product-sync-job.entity';
import { ProductService } from './product.service';
import { ChatbotsService } from '../../chatbots/chatbots.service';
import { ConnectorFactory } from '../../connectors/connector.factory';
import { ProductSyncJobStatus, ProductSyncType, PlatformType } from '@chatbot-platform/shared-types';

describe('ProductSyncService', () => {
  let syncService: ProductSyncService;
  let mockJobRepo: Partial<Record<keyof Repository<ProductSyncJob>, ReturnType<typeof vi.fn>>>;
  let mockProductService: Partial<Record<keyof ProductService, ReturnType<typeof vi.fn>>>;
  let mockChatbotsService: Partial<Record<keyof ChatbotsService, ReturnType<typeof vi.fn>>>;
  let mockConnectorFactory: Partial<Record<keyof ConnectorFactory, ReturnType<typeof vi.fn>>>;
  let mockQueue: Partial<Record<keyof Queue, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockJobRepo = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'job-123', ...dto })),
      save: vi.fn().mockImplementation((job) => Promise.resolve(job)),
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
    };

    mockProductService = {
      upsertBatch: vi.fn().mockResolvedValue({ synced: 10, created: 5, updated: 5, unchanged: 0, failed: 0, errors: [] }),
    };

    mockChatbotsService = {
      findOne: vi.fn().mockResolvedValue({ id: 'bot-1', platformType: PlatformType.GENERIC, connectorConfig: {} }),
    };

    mockConnectorFactory = {
      create: vi.fn().mockReturnValue({
        fetchProducts: vi.fn().mockResolvedValue({ products: [{ externalId: 'p1', name: 'Test' }], hasMore: false }),
        fetchCategories: vi.fn().mockResolvedValue([]),
        testConnection: vi.fn().mockResolvedValue(true),
      }),
    };

    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'bull-job-1' }),
    };

    syncService = new ProductSyncService(
      mockJobRepo as unknown as Repository<ProductSyncJob>,
      mockProductService as unknown as ProductService,
      mockChatbotsService as unknown as ChatbotsService,
      mockConnectorFactory as unknown as ConnectorFactory,
      mockQueue as unknown as Queue,
    );
  });

  describe('triggerSync', () => {
    it('should verify chatbot exists and enqueue a BullMQ job with PENDING status', async () => {
      process.env.REDIS_ENABLED = 'true';
      const job = await syncService.triggerSync('bot-1', ProductSyncType.FULL);

      expect(mockChatbotsService.findOne).toHaveBeenCalledWith('bot-1');
      expect(mockJobRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        chatbotId: 'bot-1',
        status: ProductSyncJobStatus.PENDING,
      }));
      expect(mockQueue.add).toHaveBeenCalledWith('sync', { jobId: 'job-123', chatbotId: 'bot-1' }, expect.any(Object));
      expect(job.id).toBe('job-123');
    });
  });

  describe('executeSyncJob', () => {
    it('should transition job to RUNNING and complete synchronization via connector', async () => {
      mockJobRepo.findOne = vi.fn().mockResolvedValue({
        id: 'job-123',
        chatbotId: 'bot-1',
        status: ProductSyncJobStatus.PENDING,
        productsSynced: 0,
        productsCreated: 0,
        productsUpdated: 0,
        productsFailed: 0,
      });

      const finishedJob = await syncService.executeSyncJob('job-123');

      expect(mockConnectorFactory.create).toHaveBeenCalled();
      expect(mockProductService.upsertBatch).toHaveBeenCalled();
      expect(finishedJob.status).toBe(ProductSyncJobStatus.COMPLETED);
      expect(finishedJob.productsSynced).toBe(10);
      expect(finishedJob.completedAt).toBeInstanceOf(Date);
    });
  });
});
