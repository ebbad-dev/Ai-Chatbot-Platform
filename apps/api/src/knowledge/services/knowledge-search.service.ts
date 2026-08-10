import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { ApprovedFaq } from '../entities/approved-faq.entity';
import { UnansweredQuestion } from '../entities/unanswered-question.entity';
import { FaqStatus, UnansweredQuestionStatus } from '@chatbot-platform/shared-types';

export interface KnowledgeSearchResult {
  faqs: ApprovedFaq[];
  chunks: KnowledgeChunk[];
}

/**
 * KnowledgeSearchService executing high-precision FAQ retrieval and full-text chunk searches,
 * as well as tracking unanswered customer questions for active learning and refinement.
 */
@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);

  constructor(
    @InjectRepository(ApprovedFaq)
    private readonly faqRepository: Repository<ApprovedFaq>,
    @InjectRepository(KnowledgeChunk)
    private readonly chunkRepository: Repository<KnowledgeChunk>,
    @InjectRepository(UnansweredQuestion)
    private readonly unansweredRepository: Repository<UnansweredQuestion>,
  ) {}

  /**
   * Perform combined FAQ and Document Chunk retrieval for a chatbot query.
   */
  async search(chatbotId: string, query: string, maxFaqs = 3, maxChunks = 5): Promise<KnowledgeSearchResult> {
    this.logger.debug(`Searching knowledge base for chatbot ${chatbotId} (query: "${query}")`);
    const [faqs, chunks] = await Promise.all([
      this.searchFaqs(chatbotId, query, maxFaqs),
      this.searchChunks(chatbotId, query, maxChunks),
    ]);

    return { faqs, chunks };
  }

  /**
   * Search approved FAQs using full-text indexing and trigram similarity on questions/answers.
   */
  async searchFaqs(chatbotId: string, query: string, limit = 3): Promise<ApprovedFaq[]> {
    const qb = this.faqRepository.createQueryBuilder('faq');
    qb.where('faq.chatbotId = :chatbotId', { chatbotId });
    qb.andWhere('faq.status = :status', { status: FaqStatus.ACTIVE });

    if (query && query.trim().length > 0) {
      const clean = query.trim();
      const ilike = `%${clean}%`;
      qb.andWhere(
        `(
          to_tsvector('english', faq.question || ' ' || faq.answer) @@ plainto_tsquery('english', :query)
          OR faq.question ILIKE :ilike
          OR faq.answer ILIKE :ilike
          OR similarity(faq.question, :query) > 0.15
        )`,
        { query: clean, ilike },
      );
      qb.addSelect(
        `ts_rank(to_tsvector('english', faq.question || ' ' || faq.answer), plainto_tsquery('english', :query)) + similarity(faq.question, :query)`,
        'score',
      );
      qb.orderBy('score', 'DESC');
    } else {
      qb.orderBy('faq.updatedAt', 'DESC');
    }

    qb.take(limit);
    return qb.getMany();
  }

  /**
   * Search knowledge base documentation chunks via PostgreSQL tsvector and pg_trgm.
   */
  async searchChunks(chatbotId: string, query: string, limit = 5): Promise<KnowledgeChunk[]> {
    const qb = this.chunkRepository.createQueryBuilder('chunk');
    qb.where('chunk.chatbotId = :chatbotId', { chatbotId });

    if (query && query.trim().length > 0) {
      const clean = query.trim();
      const ilike = `%${clean}%`;

      // Extract significant keywords (3+ chars) for per-word ILIKE matching
      const keywords = clean
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3)
        .map(w => `%${w}%`);

      // Build per-keyword ILIKE conditions (OR logic) for broader matching
      let keywordCondition = 'FALSE';
      const params: Record<string, string> = { query: clean, ilike };
      if (keywords.length > 0) {
        const keywordClauses = keywords.map((kw, i) => {
          params[`kw${i}`] = kw;
          return `chunk.content ILIKE :kw${i} OR chunk.heading_path ILIKE :kw${i} OR chunk.page_title ILIKE :kw${i}`;
        });
        keywordCondition = keywordClauses.join(' OR ');
      }

      qb.andWhere(
        `(
          coalesce(chunk.searchVector, to_tsvector('english', chunk.content)) @@ plainto_tsquery('english', :query)
          OR chunk.content ILIKE :ilike
          OR similarity(chunk.content, :query) > 0.15
          OR (${keywordCondition})
        )`,
        params,
      );
      qb.addSelect(
        `ts_rank(coalesce(chunk.searchVector, to_tsvector('english', chunk.content)), plainto_tsquery('english', :query))`,
        'rank_score',
      );
      qb.orderBy('rank_score', 'DESC');
    } else {
      qb.orderBy('chunk.updatedAt', 'DESC');
    }

    qb.take(limit);
    return qb.getMany();
  }

  /**
   * Log an unanswered user question to help business owners identify gaps in their website knowledge.
   * Automatically aggregates duplicate or identical questions.
   */
  async recordUnansweredQuestion(chatbotId: string, questionText: string): Promise<UnansweredQuestion> {
    const normalized = questionText
      .trim()
      .toLowerCase()
      .replace(/[?!.,"']/g, '')
      .replace(/\s+/g, ' ');

    const existing = await this.unansweredRepository.findOne({
      where: { chatbotId, normalizedQuestion: normalized },
    });

    const now = new Date();

    if (existing) {
      existing.occurrenceCount += 1;
      existing.lastSeenAt = now;
      this.logger.debug(`Incrementing occurrence count for question "${normalized}" (Chatbot: ${chatbotId})`);
      return this.unansweredRepository.save(existing);
    }

    const created = this.unansweredRepository.create({
      chatbotId,
      normalizedQuestion: normalized,
      exampleQuestion: questionText.trim(),
      occurrenceCount: 1,
      status: UnansweredQuestionStatus.NEW,
      firstSeenAt: now,
      lastSeenAt: now,
    });

    this.logger.log(`Recorded new unanswered question "${normalized}" for Chatbot ${chatbotId}`);
    return this.unansweredRepository.save(created);
  }
}
