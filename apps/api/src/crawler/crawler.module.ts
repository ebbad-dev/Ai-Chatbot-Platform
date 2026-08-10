import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlJob } from './entities/crawl-job.entity';
import { WebsitePage } from './entities/website-page.entity';
import { ContactRecord } from './entities/contact-record.entity';
import { ChatbotsModule } from '../chatbots/chatbots.module';

import { UrlNormalizationService } from './services/url-normalization.service';
import { UrlPolicyService } from './services/url-policy.service';
import { SafeFetchService } from './services/safe-fetch.service';
import { RobotsService } from './services/robots.service';
import { SitemapService } from './services/sitemap.service';
import { HtmlExtractionService } from './services/html-extraction.service';
import { StructuredDataService } from './services/structured-data.service';
import { ImageMetadataService } from './services/image-metadata.service';
import { ContactExtractionService } from './services/contact-extraction.service';
import { MarkdownService } from './services/markdown.service';
import { ContentDeduplicationService } from './services/content-deduplication.service';
import { CrawlJobService } from './services/crawl-job.service';
import { CrawlerService } from './services/crawler.service';
import { CrawlerController } from './crawler.controller';

import { CrawlQueueService } from './services/crawl-queue.service';
import { CrawlProcessor } from './processors/crawl.processor';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrawlJob, WebsitePage, ContactRecord]),
    BullModule.registerQueue({
      name: 'web-crawler',
    }),
    forwardRef(() => ChatbotsModule),
    KnowledgeModule,
  ],
  providers: [
    UrlNormalizationService,
    UrlPolicyService,
    SafeFetchService,
    RobotsService,
    SitemapService,
    HtmlExtractionService,
    StructuredDataService,
    ImageMetadataService,
    ContactExtractionService,
    MarkdownService,
    ContentDeduplicationService,
    CrawlJobService,
    CrawlerService,
    CrawlQueueService,
    CrawlProcessor,
  ],
  controllers: [CrawlerController],
  exports: [CrawlerService, CrawlQueueService, SafeFetchService],
})
export class CrawlerModule {}
