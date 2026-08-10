import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProductSyncService, SyncQueuePayload } from '../services/product-sync.service';

/**
 * BullMQ worker processor for 'product-sync' queue.
 * Processes synchronization jobs asynchronously in the background.
 */
@Processor('product-sync')
export class ProductSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductSyncProcessor.name);

  constructor(private readonly productSyncService: ProductSyncService) {
    super();
  }

  /**
   * Invocation entry point for BullMQ WorkerHost.
   */
  async process(job: Job<SyncQueuePayload, unknown, string>): Promise<unknown> {
    this.logger.log(`Worker processing queue item #${job.id} for ProductSyncJob ${job.data.jobId}`);
    try {
      return await this.productSyncService.executeSyncJob(job.data.jobId);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Worker failed processing job ${job.data.jobId}: ${errorMsg}`);
      throw error; // Let BullMQ handle retries/backoff
    }
  }
}
