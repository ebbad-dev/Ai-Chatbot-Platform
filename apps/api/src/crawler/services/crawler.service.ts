import { Injectable, Logger } from '@nestjs/common';
import { CrawlJobService } from './crawl-job.service';
import { SafeFetchService } from './safe-fetch.service';
import { HtmlExtractionService } from './html-extraction.service';
import { MarkdownService } from './markdown.service';
import { ContentDeduplicationService } from './content-deduplication.service';
import { ContactExtractionService } from './contact-extraction.service';
import { SitemapService } from './sitemap.service';
import { RobotsService } from './robots.service';
import { UrlPolicyService } from './url-policy.service';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';
import { CrawlJob, CrawlJobStatus } from '../entities/crawl-job.entity';

import { AppConfigService } from '../../config/app-config.service';
import { KnowledgeBuilderService } from '../../knowledge/services/knowledge-builder.service';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private readonly crawlJobService: CrawlJobService,
    private readonly pageFetchService: SafeFetchService,
    private readonly htmlExtraction: HtmlExtractionService,
    private readonly markdownService: MarkdownService,
    private readonly dedupService: ContentDeduplicationService,
    private readonly contactExtraction: ContactExtractionService,
    private readonly sitemapService: SitemapService,
    private readonly robotsService: RobotsService,
    private readonly urlPolicyService: UrlPolicyService,
    private readonly appConfig: AppConfigService,
    private readonly knowledgeBuilder: KnowledgeBuilderService,
  ) {}

  /**
   * Executes the crawl synchronous worker loop called by CrawlQueueService.
   */
  async executeCrawl(chatbot: Chatbot, jobId: string, isAborted: () => boolean): Promise<void> {
    await this.crawlJobService.updateJobStatus(jobId, CrawlJobStatus.RUNNING);
    this.logger.log(`Starting crawl job ${jobId} for chatbot ${chatbot.id} at ${chatbot.websiteOrigin}`);

    const baseOrigin = chatbot.websiteOrigin;
    const queue: { url: string; depth: number }[] = [];
    const visited = new Set<string>();

    const maxPages = Math.min(chatbot.crawlPageLimit || 50, this.appConfig.crawlerMaxPages);
    const maxDepth = Math.min(chatbot.crawlDepth || 3, this.appConfig.crawlerMaxDepth);
    const requestDelay = this.appConfig.crawlerRequestDelayMs;

    let pagesProcessed = 0;
    let pagesFailed = 0;

    // 1. Initial URLs (Home + Sitemap)
    queue.push({ url: baseOrigin, depth: 0 });
    visited.add(baseOrigin);
    await this.crawlJobService.incrementDiscovered(jobId, 1);

    const sitemapUrls = await this.sitemapService.discoverSitemapUrls(baseOrigin);
    for (const url of sitemapUrls) {
      if (isAborted()) {
        throw new Error('Crawl job aborted due to application shutdown');
      }
      if (!visited.has(url)) {
        visited.add(url);
        queue.push({ url, depth: 1 }); // Assume sitemap is depth 1
        await this.crawlJobService.incrementDiscovered(jobId, 1);
      }
    }

    // 2. BFS Loop
    while (queue.length > 0 && pagesProcessed < maxPages) {
      if (isAborted()) {
        throw new Error('Crawl job aborted due to application shutdown');
      }

      const current = queue.shift()!;
      this.logger.log(`Crawling ${current.url} (Depth: ${current.depth})`);

      // Check robots.txt
      const isAllowed = await this.robotsService.isAllowed(current.url, baseOrigin);
      if (!isAllowed) {
        this.logger.log(`Blocked by robots.txt: ${current.url}`);
        continue;
      }

      // Check URL Policy & block e-commerce product/category pages
      if (!this.urlPolicyService.isPathSafe(current.url, true)) {
        this.logger.log(`Blocked by URL safety or catalog exclusion policy: ${current.url}`);
        continue;
      }

      // Respect request delay between fetches to protect target server
      if (pagesProcessed > 0 && requestDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, requestDelay));
      }

      if (isAborted()) {
        throw new Error('Crawl job aborted due to application shutdown');
      }

      // Fetch
      const result = await this.pageFetchService.fetchSafe(current.url, baseOrigin);

      if (result.error || result.status !== 200 || !result.content) {
        this.logger.warn(`Failed to fetch ${current.url}: ${result.error || result.status}`);
        pagesFailed++;
        await this.crawlJobService.incrementFailed(jobId);
        
        // Save failed page record without overwriting past successful crawl markdown
        await this.crawlJobService.savePage({
           chatbotId: chatbot.id,
           lastCrawlJob: { id: jobId } as CrawlJob,
           url: current.url,
           canonicalUrl: current.url,
           httpStatus: result.status || 0,
           indexStatus: 'failed',
           processingStatus: 'failed',
        });
        continue;
      }

      try {
        if (isAborted()) {
          throw new Error('Crawl job aborted due to application shutdown');
        }

        // Extract content
        const extracted = this.htmlExtraction.extract(result.content, baseOrigin);
        
        // Generate Markdown
        const markdown = this.markdownService.generateMarkdown(extracted.cleanedHtml, {
           url: result.finalUrl,
           canonicalUrl: result.finalUrl,
           title: extracted.title,
           crawlDate: new Date(),
        });

        // Hash content
        const hash = this.dedupService.generateHash(markdown);

        // Extract contacts
        const contacts = this.contactExtraction.extractContacts(result.content, result.finalUrl);
        if (contacts.length > 0) {
           await this.crawlJobService.saveContacts(chatbot.id, contacts);
        }

        // Save page
        const savedPage = await this.crawlJobService.savePage({
           chatbotId: chatbot.id,
           lastCrawlJob: { id: jobId } as CrawlJob,
           url: result.finalUrl,
           canonicalUrl: result.finalUrl,
           title: extracted.title,
           metaDescription: extracted.metaDescription,
           markdownContent: markdown,
           contentHash: hash,
           httpStatus: result.status,
           contentType: result.contentType,
           indexStatus: 'completed',
           processingStatus: 'completed',
           requiresRendering: extracted.requiresRendering,
        });

        if (markdown && result.status === 200) {
           await this.knowledgeBuilder.ingestContent(chatbot.id, markdown, {
              sourceUrl: result.finalUrl,
              sourcePageId: savedPage?.id,
              pageTitle: extracted.title,
           });
        }

        pagesProcessed++;
        await this.crawlJobService.incrementProcessed(jobId);

        // Enqueue internal links if within depth limit
        if (current.depth < maxDepth) {
           for (const link of extracted.internalLinks) {
              if (isAborted()) {
                throw new Error('Crawl job aborted due to application shutdown');
              }
              if (!visited.has(link)) {
                 visited.add(link);
                 queue.push({ url: link, depth: current.depth + 1 });
                 await this.crawlJobService.incrementDiscovered(jobId, 1);
              }
           }
        }
      } catch (err: unknown) {
        this.logger.error(`Error processing ${current.url}: ${(err as Error).message}`);
        pagesFailed++;
        await this.crawlJobService.incrementFailed(jobId);
      }
    }

    const finalStatus = pagesFailed > 0 ? CrawlJobStatus.COMPLETED_WITH_ERRORS : CrawlJobStatus.COMPLETED;
    await this.crawlJobService.updateJobStatus(jobId, finalStatus);
    this.logger.log(`Crawl job ${jobId} finished with status ${finalStatus}`);
  }
}
