import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { KnowledgeBuilderService } from './knowledge-builder.service';
import { ChunkingService } from './chunking.service';
import { Repository } from 'typeorm';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { ApprovedFaq } from '../entities/approved-faq.entity';
import { UnansweredQuestion } from '../entities/unanswered-question.entity';
import { FaqStatus, ResolutionType, UnansweredQuestionStatus } from '@chatbot-platform/shared-types';

describe('KnowledgeBuilderService', () => {
  let service: KnowledgeBuilderService;
  let mockChunkRepo: Partial<Record<keyof Repository<KnowledgeChunk>, Mock>>;
  let mockFaqRepo: Partial<Record<keyof Repository<ApprovedFaq>, Mock>>;
  let mockUnansweredRepo: Partial<Record<keyof Repository<UnansweredQuestion>, Mock>>;
  let mockChunkingService: Partial<Record<keyof ChunkingService, Mock>>;

  beforeEach(() => {
    mockChunkRepo = {
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
      create: vi.fn().mockImplementation((dto) => ({ id: 'c-1', ...dto })),
      save: vi.fn().mockImplementation((items) => Promise.resolve(items)),
      findAndCount: vi.fn().mockResolvedValue([[], 0]),
    };

    mockFaqRepo = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'f-1', ...dto })),
      save: vi.fn().mockImplementation((item) => Promise.resolve({ id: 'f-1', ...item })),
      findOne: vi.fn().mockResolvedValue({ id: 'f-1', chatbotId: 'bot-1', question: 'Old Q', status: FaqStatus.DRAFT }),
      findAndCount: vi.fn().mockResolvedValue([[{ id: 'f-1' }], 1]),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    mockUnansweredRepo = {
      findOne: vi.fn().mockResolvedValue({
        id: 'q-1',
        chatbotId: 'bot-1',
        exampleQuestion: 'Do you offer bulk discounts?',
        status: UnansweredQuestionStatus.NEW,
      }),
      save: vi.fn().mockImplementation((item) => Promise.resolve(item)),
    };

    mockChunkingService = {
      chunkText: vi.fn().mockReturnValue([
        { content: 'Section 1', headingPath: 'Intro', contentHash: 'hash-1', chunkOrder: 0 },
      ]),
    };

    service = new KnowledgeBuilderService(
      mockChunkRepo as unknown as Repository<KnowledgeChunk>,
      mockFaqRepo as unknown as Repository<ApprovedFaq>,
      mockUnansweredRepo as unknown as Repository<UnansweredQuestion>,
      mockChunkingService as unknown as ChunkingService,
    );
  });

  describe('ingestContent', () => {
    it('should chunk content and clear out outdated chunks when updating sourceUrl', async () => {
      const res = await service.ingestContent('bot-1', '# Intro\nSome text here', { sourceUrl: 'https://store/faq' });

      expect(mockChunkingService.chunkText).toHaveBeenCalledWith('# Intro\nSome text here', undefined);
      expect(mockChunkRepo.delete).toHaveBeenCalledWith({ chatbotId: 'bot-1', sourceUrl: 'https://store/faq' });
      expect(mockChunkRepo.save).toHaveBeenCalled();
      expect(res).toBe(1);
    });

    it('should return 0 when content is empty', async () => {
      expect(await service.ingestContent('bot-1', '  ')).toBe(0);
      expect(mockChunkRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('FAQ lifecycle and unanswered resolution', () => {
    it('should create approved FAQ with active status by default', async () => {
      const faq = await service.createFaq('bot-1', 'What is shipping cost?', 'Free over $50');
      expect(faq.status).toBe(FaqStatus.ACTIVE);
      expect(mockFaqRepo.save).toHaveBeenCalled();
    });

    it('should resolve unanswered question by converting it into an active FAQ', async () => {
      const resolved = await service.resolveUnansweredQuestion('q-1', 'bot-1', ResolutionType.APPROVED_FAQ, {
        createFaqAnswer: 'Yes, 15% discount for 50+ items.',
      });

      expect(resolved.status).toBe(UnansweredQuestionStatus.RESOLVED);
      expect(resolved.resolutionType).toBe(ResolutionType.APPROVED_FAQ);
      expect(mockFaqRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          question: 'Do you offer bulk discounts?',
          answer: 'Yes, 15% discount for 50+ items.',
          status: FaqStatus.ACTIVE,
        }),
      );
    });
  });
});
