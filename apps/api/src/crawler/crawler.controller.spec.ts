import { Test, TestingModule } from '@nestjs/testing';
import { CrawlerController } from './crawler.controller';
import { CrawlQueueService } from './services/crawl-queue.service';
import { CrawlJobService } from './services/crawl-job.service';
import { ChatbotsService } from '../chatbots/chatbots.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';

import { vi } from 'vitest';

describe('CrawlerController', () => {
  let controller: CrawlerController;
  let mockChatbotsService: Partial<ChatbotsService>;
  let mockCrawlJobService: Partial<CrawlJobService>;
  let mockCrawlQueueService: Partial<CrawlQueueService>;

  beforeEach(async () => {
    mockChatbotsService = {
      findOne: vi.fn().mockResolvedValue({ id: 'bot-123', websiteOrigin: 'https://example.com' }),
    };

    mockCrawlJobService = {
      getJobStatus: vi.fn().mockResolvedValue({ id: 'job-123', status: 'completed' }),
      getPages: vi.fn().mockResolvedValue([]),
      getPage: vi.fn().mockResolvedValue({ id: 'page-123' }),
    };

    mockCrawlQueueService = {
      enqueue: vi.fn().mockResolvedValue({ id: 'job-123', status: 'pending' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrawlerController],
      providers: [
        { provide: ChatbotsService, useValue: mockChatbotsService },
        { provide: CrawlJobService, useValue: mockCrawlJobService },
        { provide: CrawlQueueService, useValue: mockCrawlQueueService },
      ],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CrawlerController>(CrawlerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should start a crawl successfully', async () => {
    const result = await controller.startCrawl('bot-123');
    expect(result).toEqual({ jobId: 'job-123', status: 'pending' });
    expect(mockCrawlQueueService.enqueue).toHaveBeenCalled();
  });

  it('should get crawl status', async () => {
    const result = await controller.getCrawlStatus('bot-123');
    expect(result).toEqual({ id: 'job-123', status: 'completed' });
  });

  it('should get pages', async () => {
    const result = await controller.getPages('bot-123');
    expect(result).toEqual([]);
  });

  it('should get page by id', async () => {
    const result = await controller.getPage('bot-123', 'page-123');
    expect(result).toEqual({ id: 'page-123' });
  });
});
