import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CrawlJob } from '../entities/crawl-job.entity';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';
import { CrawlJobService } from './crawl-job.service';
import { CrawlQueuePayload } from '../processors/crawl.processor';

/**
 * CrawlQueueService orchestrating background web crawling via BullMQ and Redis.
 * Eliminates single-node in-memory race conditions and enables robust horizontal scaling.
 */
@Injectable()
export class CrawlQueueService {
  private readonly logger = new Logger(CrawlQueueService.name);

  constructor(
    private readonly crawlJobService: CrawlJobService,
    @InjectQueue('web-crawler')
    private readonly crawlQueue: Queue<CrawlQueuePayload>,
  ) {}

  /**
   * Enqueues a new asynchronous crawl job via BullMQ.
   */
  async enqueue(chatbot: Chatbot): Promise<CrawlJob> {
    // 1. Persist PENDING job in Postgres (CrawlJobService handles active crawl prevention guard)
    const job = await this.crawlJobService.createJob(chatbot.id);

    // 2. Dispatch to BullMQ Redis Queue
    const payload: CrawlQueuePayload = {
      jobId: job.id,
      chatbotId: chatbot.id,
    };

    await this.crawlQueue.add('crawl', payload, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`Dispatched BullMQ web crawl job for chatbot ${chatbot.id} (Job ID: ${job.id})`);
    return job;
  }
}
