import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlJob, CrawlJobStatus } from '../entities/crawl-job.entity';
import { WebsitePage } from '../entities/website-page.entity';
import { ContactRecord } from '../entities/contact-record.entity';

@Injectable()
export class CrawlJobService {
  constructor(
    @InjectRepository(CrawlJob)
    private readonly crawlJobRepo: Repository<CrawlJob>,
    @InjectRepository(WebsitePage)
    private readonly websitePageRepo: Repository<WebsitePage>,
    @InjectRepository(ContactRecord)
    private readonly contactRecordRepo: Repository<ContactRecord>,
  ) {}

  async createJob(chatbotId: string): Promise<CrawlJob> {
    // Prevent multiple active jobs
    const activeJob = await this.crawlJobRepo.findOne({
      where: [
        { chatbotId, status: CrawlJobStatus.PENDING },
        { chatbotId, status: CrawlJobStatus.RUNNING },
      ],
    });

    if (activeJob) {
      throw new Error('A crawl job is already active for this chatbot.');
    }

    const job = this.crawlJobRepo.create({ chatbotId });
    return this.crawlJobRepo.save(job);
  }

  async getJobStatus(chatbotId: string): Promise<CrawlJob | null> {
    return this.crawlJobRepo.findOne({
      where: { chatbotId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateJobStatus(jobId: string, status: CrawlJobStatus, errorSummary?: string): Promise<void> {
    const updateData: Partial<CrawlJob> = { status };
    if (status === CrawlJobStatus.RUNNING) {
      updateData.startedAt = new Date();
    } else if (
      status === CrawlJobStatus.COMPLETED ||
      status === CrawlJobStatus.COMPLETED_WITH_ERRORS ||
      status === CrawlJobStatus.FAILED ||
      status === CrawlJobStatus.CANCELLED
    ) {
      updateData.completedAt = new Date();
    }
    
    if (errorSummary) {
      updateData.errorSummary = errorSummary;
    }

    await this.crawlJobRepo.update(jobId, updateData);
  }

  async incrementDiscovered(jobId: string, count: number = 1): Promise<void> {
    await this.crawlJobRepo.increment({ id: jobId }, 'pagesDiscovered', count);
  }

  async incrementProcessed(jobId: string): Promise<void> {
    await this.crawlJobRepo.increment({ id: jobId }, 'pagesProcessed', 1);
  }

  async incrementFailed(jobId: string): Promise<void> {
    await this.crawlJobRepo.increment({ id: jobId }, 'pagesFailed', 1);
  }

  async savePage(pageData: Partial<WebsitePage>): Promise<WebsitePage> {
    // Upsert based on chatbotId + canonicalUrl
    if (!pageData.chatbotId || !pageData.canonicalUrl) {
       throw new Error('chatbotId and canonicalUrl required to save page');
    }

    let page = await this.websitePageRepo.findOne({
      where: { chatbotId: pageData.chatbotId, canonicalUrl: pageData.canonicalUrl }
    });

    const now = new Date();
    if (page) {
      const cleanData = { ...pageData };
      if (pageData.processingStatus === 'failed') {
        // Do not overwrite previous successful results on transient error
        delete cleanData.markdownContent;
        delete cleanData.contentHash;
        delete cleanData.title;
        delete cleanData.metaDescription;
      }
      page = this.websitePageRepo.merge(page, cleanData);
      page.lastSeenAt = now;
      page.lastCrawledAt = now;
    } else {
      page = this.websitePageRepo.create(pageData);
      page.firstSeenAt = now;
      page.lastSeenAt = now;
      page.lastCrawledAt = now;
    }

    return this.websitePageRepo.save(page);
  }

  async saveContacts(chatbotId: string, contacts: Partial<ContactRecord>[]): Promise<void> {
    if (contacts.length === 0) return;

    // Very naive deduplication for MVP: check if normalized value exists for this bot
    for (const contact of contacts) {
      const existing = await this.contactRecordRepo.findOne({
        where: { chatbotId, type: contact.type, normalizedValue: contact.normalizedValue }
      });
      if (!existing) {
        const newContact = this.contactRecordRepo.create({ ...contact, chatbotId });
        await this.contactRecordRepo.save(newContact);
      }
    }
  }

  async getPages(chatbotId: string, limit: number = 50, offset: number = 0): Promise<WebsitePage[]> {
    return this.websitePageRepo.find({
      where: { chatbotId },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
  }

  async getPage(chatbotId: string, pageId: string): Promise<WebsitePage> {
    const page = await this.websitePageRepo.findOne({ where: { id: pageId, chatbotId } });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }
}
