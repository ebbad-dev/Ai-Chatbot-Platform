import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { ApprovedFaq } from '../entities/approved-faq.entity';
import { UnansweredQuestion } from '../entities/unanswered-question.entity';
import { ChunkingService } from './chunking.service';
import { KnowledgeSourceType, FaqStatus, UnansweredQuestionStatus, ResolutionType } from '@chatbot-platform/shared-types';

export interface IngestContentOptions {
  sourceUrl?: string;
  sourcePageId?: string;
  pageTitle?: string;
  sourceType?: KnowledgeSourceType;
}

/**
 * KnowledgeBuilderService responsible for managing knowledge lifecycle:
 * ingestion and semantic chunking of webpage text, FAQ authoring and management,
 * and resolution workflow for unanswered customer questions.
 */
@Injectable()
export class KnowledgeBuilderService {
  private readonly logger = new Logger(KnowledgeBuilderService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepository: Repository<KnowledgeChunk>,
    @InjectRepository(ApprovedFaq)
    private readonly faqRepository: Repository<ApprovedFaq>,
    @InjectRepository(UnansweredQuestion)
    private readonly unansweredRepository: Repository<UnansweredQuestion>,
    private readonly chunkingService: ChunkingService,
  ) {}

  /**
   * Process and index raw webpage text or merchant documentation into structured database chunks.
   * Replaces outdated chunks if re-indexing an existing webpage URL.
   */
  async ingestContent(chatbotId: string, content: string, opts: IngestContentOptions = {}): Promise<number> {
    if (!content || !content.trim()) {
      return 0;
    }

    const sourceType = opts.sourceType || KnowledgeSourceType.CRAWL;
    const generatedChunks = this.chunkingService.chunkText(content, opts.pageTitle);

    if (generatedChunks.length === 0) {
      return 0;
    }

    // If updating a sourceUrl or sourcePageId, clear out previous chunks first
    if (opts.sourceUrl) {
      await this.chunkRepository.delete({ chatbotId, sourceUrl: opts.sourceUrl });
    } else if (opts.sourcePageId) {
      await this.chunkRepository.delete({ chatbotId, sourcePageId: opts.sourcePageId });
    }

    const entities = generatedChunks.map((c) =>
      this.chunkRepository.create({
        chatbotId,
        content: c.content,
        headingPath: c.headingPath,
        contentHash: c.contentHash,
        chunkOrder: c.chunkOrder,
        sourcePageId: opts.sourcePageId || null,
        sourceUrl: opts.sourceUrl || null,
        pageTitle: opts.pageTitle || null,
        sourceType,
      }),
    );

    await this.chunkRepository.save(entities);
    this.logger.log(`Ingested ${entities.length} chunks for Chatbot ${chatbotId} (${opts.sourceUrl || 'custom input'})`);
    return entities.length;
  }

  /**
   * List indexed knowledge chunks for a chatbot.
   */
  async listChunks(chatbotId: string, limit = 50, offset = 0): Promise<{ items: KnowledgeChunk[]; total: number }> {
    const [items, total] = await this.chunkRepository.findAndCount({
      where: { chatbotId },
      order: { chunkOrder: 'ASC', createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  // ─── FAQ Management ────────────────────────────────────────────────────────

  async createFaq(
    chatbotId: string,
    question: string,
    answer: string,
    status = FaqStatus.ACTIVE,
    sourceUrl?: string,
    approvedBy?: string,
  ): Promise<ApprovedFaq> {
    const faq = this.faqRepository.create({
      chatbotId,
      question: question.trim(),
      answer: answer.trim(),
      status,
      sourceUrl: sourceUrl || null,
      approvedBy: approvedBy || null,
      approvedAt: status === FaqStatus.ACTIVE ? new Date() : null,
    });
    const saved = await this.faqRepository.save(faq);
    this.logger.log(`Created FAQ ${saved.id} for Chatbot ${chatbotId} (${status})`);
    return saved;
  }

  async listFaqs(
    chatbotId: string,
    status?: FaqStatus,
    limit = 50,
    offset = 0,
  ): Promise<{ items: ApprovedFaq[]; total: number }> {
    const where: { chatbotId: string; status?: FaqStatus } = { chatbotId };
    if (status) where.status = status;

    const [items, total] = await this.faqRepository.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  async updateFaq(
    id: string,
    chatbotId: string,
    data: Partial<{ question: string; answer: string; status: FaqStatus; sourceUrl: string; approvedBy: string }>,
  ): Promise<ApprovedFaq> {
    const faq = await this.faqRepository.findOne({ where: { id, chatbotId } });
    if (!faq) {
      throw new NotFoundException(`FAQ ${id} not found for chatbot ${chatbotId}`);
    }

    if (data.question !== undefined) faq.question = data.question.trim();
    if (data.answer !== undefined) faq.answer = data.answer.trim();
    if (data.sourceUrl !== undefined) faq.sourceUrl = data.sourceUrl;
    if (data.approvedBy !== undefined) faq.approvedBy = data.approvedBy;
    if (data.status !== undefined) {
      faq.status = data.status;
      if (data.status === FaqStatus.ACTIVE && !faq.approvedAt) {
        faq.approvedAt = new Date();
      }
    }

    return this.faqRepository.save(faq);
  }

  async deleteFaq(id: string, chatbotId: string): Promise<boolean> {
    const res = await this.faqRepository.delete({ id, chatbotId });
    return (res.affected && res.affected > 0) || false;
  }

  // ─── Unanswered Questions Workflow ─────────────────────────────────────────

  async listUnansweredQuestions(
    chatbotId: string,
    status = UnansweredQuestionStatus.NEW,
    limit = 50,
    offset = 0,
  ): Promise<{ items: UnansweredQuestion[]; total: number }> {
    const [items, total] = await this.unansweredRepository.findAndCount({
      where: { chatbotId, status },
      order: { occurrenceCount: 'DESC', lastSeenAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  async resolveUnansweredQuestion(
    id: string,
    chatbotId: string,
    resolutionType: ResolutionType,
    opts: { resolvedSourceUrl?: string; createFaqAnswer?: string; approvedBy?: string } = {},
  ): Promise<UnansweredQuestion> {
    const question = await this.unansweredRepository.findOne({ where: { id, chatbotId } });
    if (!question) {
      throw new NotFoundException(`Unanswered question ${id} not found for chatbot ${chatbotId}`);
    }

    question.resolutionType = resolutionType;

    if (resolutionType === ResolutionType.APPROVED_FAQ) {
      if (!opts.createFaqAnswer) {
        throw new BadRequestException('createFaqAnswer is required when resolutionType is approved_faq');
      }
      const faq = await this.createFaq(
        chatbotId,
        question.exampleQuestion,
        opts.createFaqAnswer,
        FaqStatus.ACTIVE,
        opts.resolvedSourceUrl,
        opts.approvedBy,
      );
      question.resolvedFaqId = faq.id;
    } else if (resolutionType === ResolutionType.LINKED_PAGE) {
      if (!opts.resolvedSourceUrl) {
        throw new BadRequestException('resolvedSourceUrl is required when resolutionType is linked_page');
      }
      question.resolvedSourceUrl = opts.resolvedSourceUrl;
    }

    question.status = UnansweredQuestionStatus.RESOLVED;
    const saved = await this.unansweredRepository.save(question);
    this.logger.log(`Resolved question ${id} for Chatbot ${chatbotId} via ${resolutionType}`);
    return saved;
  }
}
