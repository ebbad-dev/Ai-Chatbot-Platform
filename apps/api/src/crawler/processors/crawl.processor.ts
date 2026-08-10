import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CrawlerService } from '../services/crawler.service';
import { ChatbotsService } from '../../chatbots/chatbots.service';

export interface CrawlQueuePayload {
  jobId: string;
  chatbotId: string;
}

/**
 * BullMQ Worker processor for async, distributed web crawling jobs.
 * Runs independently of HTTP requests and supports automatic retries and crash recovery.
 */
@Processor('web-crawler')
export class CrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlProcessor.name);

  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly chatbotsService: ChatbotsService,
  ) {
    super();
  }

  async process(job: Job<CrawlQueuePayload>): Promise<any> {
    const { jobId, chatbotId } = job.data;
    this.logger.log(
      `Processing BullMQ crawl job ${jobId} for chatbot ${chatbotId} (Attempt: ${job.attemptsMade + 1})`,
    );

    const chatbot = await this.chatbotsService.findOne(chatbotId);
    if (!chatbot) {
      this.logger.error(`Chatbot ${chatbotId} not found for crawl job ${jobId}`);
      throw new Error(`Chatbot ${chatbotId} not found`);
    }

    await this.crawlerService.executeCrawl(chatbot, jobId, () => false);
    return { success: true, jobId, chatbotId };
  }
}
