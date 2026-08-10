import { Controller, Post, Get, Param, UseGuards, HttpException, HttpStatus, HttpCode } from '@nestjs/common';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { CrawlQueueService } from './services/crawl-queue.service';
import { CrawlJobService } from './services/crawl-job.service';
import { ChatbotsService } from '../chatbots/chatbots.service';

@UseGuards(InternalApiKeyGuard)
@Controller('internal/chatbots/:id')
export class CrawlerController {
  constructor(
    private readonly crawlQueueService: CrawlQueueService,
    private readonly crawlJobService: CrawlJobService,
    private readonly chatbotsService: ChatbotsService,
  ) {}

  @Post('crawl')
  @HttpCode(HttpStatus.ACCEPTED)
  async startCrawl(@Param('id') chatbotId: string) {
    const chatbot = await this.chatbotsService.findOne(chatbotId);
    if (!chatbot) {
      throw new HttpException('Chatbot not found', HttpStatus.NOT_FOUND);
    }

    if (!chatbot.websiteOrigin) {
      throw new HttpException('Chatbot has no website origin configured', HttpStatus.BAD_REQUEST);
    }

    try {
      const job = await this.crawlQueueService.enqueue(chatbot);
      
      return {
        jobId: job.id,
        status: job.status,
      };
    } catch (error: unknown) {
      throw new HttpException((error as Error).message || 'Failed to start crawl', HttpStatus.CONFLICT);
    }
  }

  @Get('crawl-status')
  async getCrawlStatus(@Param('id') chatbotId: string) {
    const job = await this.crawlJobService.getJobStatus(chatbotId);
    if (!job) {
      return { status: 'none' };
    }
    return job;
  }

  @Get('pages')
  async getPages(@Param('id') chatbotId: string) {
    // Basic implementation; would add pagination params in a real scenario
    const pages = await this.crawlJobService.getPages(chatbotId, 50, 0);
    // Exclude full markdown from list for payload size
    return pages.map(p => ({
       id: p.id,
       url: p.url,
       title: p.title,
       httpStatus: p.httpStatus,
       indexStatus: p.indexStatus,
       lastCrawledAt: p.lastCrawledAt
    }));
  }

  @Get('pages/:pageId')
  async getPage(@Param('id') chatbotId: string, @Param('pageId') pageId: string) {
    return this.crawlJobService.getPage(chatbotId, pageId);
  }
}
