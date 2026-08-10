import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { KnowledgeSearchService } from './knowledge-search.service';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { ApprovedFaq } from '../entities/approved-faq.entity';
import { UnansweredQuestion } from '../entities/unanswered-question.entity';

describe('KnowledgeSearchService', () => {
  let service: KnowledgeSearchService;
  let mockFaqRepo: Partial<Record<keyof Repository<ApprovedFaq>, Mock>>;
  let mockChunkRepo: Partial<Record<keyof Repository<KnowledgeChunk>, Mock>>;
  let mockUnansweredRepo: Partial<Record<keyof Repository<UnansweredQuestion>, Mock>>;

  const createMockQueryBuilder = (result: unknown[]) => {
    const qb: Partial<SelectQueryBuilder<any>> = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue(result),
    };
    return qb as SelectQueryBuilder<any>;
  };

  beforeEach(() => {
    mockFaqRepo = {
      createQueryBuilder: vi.fn().mockReturnValue(createMockQueryBuilder([{ id: 'faq-1', question: 'Shipping fees?' }])),
    };

    mockChunkRepo = {
      createQueryBuilder: vi.fn().mockReturnValue(createMockQueryBuilder([{ id: 'chk-1', content: 'Free shipping terms' }])),
    };

    mockUnansweredRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((dto) => ({ id: 'un-1', ...dto })),
      save: vi.fn().mockImplementation((item) => Promise.resolve({ id: 'un-1', ...item })),
    };

    service = new KnowledgeSearchService(
      mockFaqRepo as unknown as Repository<ApprovedFaq>,
      mockChunkRepo as unknown as Repository<KnowledgeChunk>,
      mockUnansweredRepo as unknown as Repository<UnansweredQuestion>,
    );
  });

  describe('search', () => {
    it('should query both active FAQs and document chunks with hybrid relevance scoring', async () => {
      const results = await service.search('bot-1', 'shipping fees', 3, 5);

      expect(results.faqs).toHaveLength(1);
      expect(results.chunks).toHaveLength(1);
      expect(mockFaqRepo.createQueryBuilder).toHaveBeenCalledWith('faq');
      expect(mockChunkRepo.createQueryBuilder).toHaveBeenCalledWith('chunk');
    });
  });

  describe('recordUnansweredQuestion', () => {
    it('should create new unanswered question if not previously recorded', async () => {
      const res = await service.recordUnansweredQuestion('bot-1', 'Do you ship internationally to Tokyo?');
      expect(res.normalizedQuestion).toBe('do you ship internationally to tokyo');
      expect(res.occurrenceCount).toBe(1);
      expect(mockUnansweredRepo.save).toHaveBeenCalled();
    });

    it('should increment occurrenceCount on repeat question', async () => {
      const existing = { id: 'un-1', occurrenceCount: 2, normalizedQuestion: 'do you ship internationally to tokyo' };
      (mockUnansweredRepo.findOne as Mock).mockResolvedValue(existing);

      const res = await service.recordUnansweredQuestion('bot-1', 'Do you ship internationally to Tokyo???');
      expect(res.occurrenceCount).toBe(3);
      expect(mockUnansweredRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ occurrenceCount: 3 }),
      );
    });
  });
});
