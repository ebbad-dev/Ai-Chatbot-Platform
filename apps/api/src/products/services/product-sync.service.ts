import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProductSyncJob } from '../entities/product-sync-job.entity';
import { ProductService } from './product.service';
import { ChatbotsService } from '../../chatbots/chatbots.service';
import { ConnectorFactory } from '../../connectors/connector.factory';
import { CategoryData } from '../../connectors/connector.interface';
import { ProductSyncJobStatus, ProductSyncType } from '@chatbot-platform/shared-types';

export interface SyncQueuePayload {
  jobId: string;
  chatbotId: string;
}

@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger(ProductSyncService.name);
  private readonly MAX_PAGES = 50; // Safety cap against infinite API loops (up to 25,000 items)

  constructor(
    @InjectRepository(ProductSyncJob)
    private readonly jobRepository: Repository<ProductSyncJob>,
    private readonly productService: ProductService,
    private readonly chatbotsService: ChatbotsService,
    private readonly connectorFactory: ConnectorFactory,
    @InjectQueue('product-sync')
    private readonly syncQueue: Queue<SyncQueuePayload>,
  ) {}

  /**
   * Trigger a product synchronization job for a chatbot.
   * Creates a tracking entity in PostgreSQL and dispatches a task to BullMQ.
   */
  async triggerSync(
    chatbotId: string,
    syncType: ProductSyncType = ProductSyncType.FULL,
  ): Promise<ProductSyncJob> {
    // Ensure chatbot exists
    await this.chatbotsService.findOne(chatbotId);

    const job = this.jobRepository.create({
      chatbotId,
      status: ProductSyncJobStatus.PENDING,
      syncType,
      productsSynced: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsFailed: 0,
    });

    const savedJob = await this.jobRepository.save(job);

    try {
      if (process.env.REDIS_ENABLED === 'true') {
        await this.syncQueue.add(
          'sync',
          { jobId: savedJob.id, chatbotId },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        );
        this.logger.log(`Dispatched BullMQ sync job for chatbot ${chatbotId} (Job ID: ${savedJob.id})`);
      } else {
        this.logger.log(`Redis disabled. Executing sync synchronously for ${chatbotId} (Job ID: ${savedJob.id})`);
        this.executeSyncJob(savedJob.id).catch(err => this.logger.error(err));
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to dispatch BullMQ job: ${msg}. If offline/tests, job remains pending.`);
      savedJob.errorSummary = `Queue dispatch failed: ${msg}`;
      await this.jobRepository.save(savedJob);
    }

    return savedJob;
  }

  /**
   * Core execution worker method.
   * Called by BullMQ processor (or invoked synchronously in fallback/tests).
   */
  async executeSyncJob(jobId: string): Promise<ProductSyncJob> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`ProductSyncJob ${jobId} not found`);
    }

    this.logger.log(`Executing ProductSyncJob ${job.id} for chatbot ${job.chatbotId} (${job.syncType})`);
    job.status = ProductSyncJobStatus.RUNNING;
    job.startedAt = new Date();
    await this.jobRepository.save(job);

    try {
      const chatbot = await this.chatbotsService.findOne(job.chatbotId);
      const connector = this.connectorFactory.create(chatbot.platformType, chatbot.connectorConfig);

      // Verify connection or fetch capabilities
      let categories: CategoryData[] = [];
      try {
        categories = await connector.fetchCategories();
      } catch {
        this.logger.warn(`Could not fetch explicit categories for chatbot ${job.chatbotId}`);
      }

      let page = 1;
      const limit = 500;
      let hasMore = true;
      const allErrors: string[] = [];

      while (hasMore && page <= this.MAX_PAGES) {
        this.logger.log(`Fetching batch page ${page} from connector for chatbot ${job.chatbotId}`);
        const batch = await connector.fetchProducts(page, limit);

        if (batch.products.length > 0) {
          const res = await this.productService.upsertBatch(
            job.chatbotId,
            batch.products,
            page === 1 ? categories : undefined,
          );

          job.productsSynced += res.synced;
          job.productsCreated += res.created;
          job.productsUpdated += res.updated;
          job.productsFailed += res.failed;

          if (res.errors.length > 0) {
            allErrors.push(...res.errors.slice(0, 5)); // keep error log readable
          }
        }

        hasMore = batch.hasMore && batch.products.length > 0;
        page++;

        // Save incremental progress
        await this.jobRepository.save(job);
      }

      job.completedAt = new Date();
      if (job.productsFailed > 0 && job.productsSynced === 0) {
        job.status = ProductSyncJobStatus.FAILED;
      } else if (job.productsFailed > 0) {
        job.status = ProductSyncJobStatus.COMPLETED_WITH_ERRORS;
      } else {
        job.status = ProductSyncJobStatus.COMPLETED;
      }

      if (allErrors.length > 0) {
        job.errorSummary = allErrors.join('; ');
      }

      this.logger.log(
        `Sync Job ${job.id} completed: status=${job.status}, synced=${job.productsSynced}, created=${job.productsCreated}, updated=${job.productsUpdated}, failed=${job.productsFailed}`,
      );
      return await this.jobRepository.save(job);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sync Job ${job.id} failed fatally: ${errorMsg}`);
      job.status = ProductSyncJobStatus.FAILED;
      job.errorSummary = `Fatal error: ${errorMsg}`;
      job.completedAt = new Date();
      return await this.jobRepository.save(job);
    }
  }

  /**
   * Get sync job status and statistics by ID.
   */
  async getJobStatus(jobId: string, chatbotId: string): Promise<ProductSyncJob | null> {
    return this.jobRepository.findOne({ where: { id: jobId, chatbotId } });
  }

  /**
   * List recent sync jobs for a chatbot.
   */
  async listJobsByChatbot(chatbotId: string, limit = 10): Promise<ProductSyncJob[]> {
    return this.jobRepository.find({
      where: { chatbotId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
