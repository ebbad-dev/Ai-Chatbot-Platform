import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeBuilderService } from './services/knowledge-builder.service';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { FaqStatus, UnansweredQuestionStatus, ResolutionType } from '@chatbot-platform/shared-types';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('KnowledgeController', () => {
  let controller: KnowledgeController;
  let mockBuilderService: {
    listChunks: ReturnType<typeof vi.fn>;
    createFaq: ReturnType<typeof vi.fn>;
    listFaqs: ReturnType<typeof vi.fn>;
    updateFaq: ReturnType<typeof vi.fn>;
    deleteFaq: ReturnType<typeof vi.fn>;
    listUnansweredQuestions: ReturnType<typeof vi.fn>;
    resolveUnansweredQuestion: ReturnType<typeof vi.fn>;
  };
  let mockSearchService: {
    search: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockBuilderService = {
      listChunks: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      createFaq: vi.fn().mockResolvedValue({ id: 'faq-1', question: 'Q?', answer: 'A!' }),
      listFaqs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      updateFaq: vi.fn().mockResolvedValue({ id: 'faq-1', question: 'Updated Q?' }),
      deleteFaq: vi.fn().mockResolvedValue(true),
      listUnansweredQuestions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      resolveUnansweredQuestion: vi.fn().mockResolvedValue({ id: 'un-1', status: UnansweredQuestionStatus.RESOLVED }),
    };

    mockSearchService = {
      search: vi.fn().mockResolvedValue({ faqs: [], chunks: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: KnowledgeBuilderService, useValue: mockBuilderService },
        { provide: KnowledgeSearchService, useValue: mockSearchService },
      ],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<KnowledgeController>(KnowledgeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchKnowledge', () => {
    it('should delegate search to KnowledgeSearchService', async () => {
      const res = await controller.searchKnowledge('bot-1', { query: 'custom print', maxFaqs: 5, maxChunks: 3 });
      expect(mockSearchService.search).toHaveBeenCalledWith('bot-1', 'custom print', 5, 3);
      expect(res).toEqual({ faqs: [], chunks: [] });
    });
  });

  describe('FAQ lifecycle endpoints', () => {
    it('should create an FAQ', async () => {
      const dto = { question: 'What is printing?', answer: 'Applying ink to media.', status: FaqStatus.ACTIVE, sourceUrl: 'https://test.com', approvedBy: 'Staff' };
      const res = await controller.createFaq('bot-1', dto);
      expect(mockBuilderService.createFaq).toHaveBeenCalledWith('bot-1', 'What is printing?', 'Applying ink to media.', FaqStatus.ACTIVE, 'https://test.com', 'Staff');
      expect(res).toEqual({ id: 'faq-1', question: 'Q?', answer: 'A!' });
    });

    it('should list FAQs with pagination and filtering', async () => {
      await controller.listFaqs('bot-1', FaqStatus.ACTIVE, 10, 5);
      expect(mockBuilderService.listFaqs).toHaveBeenCalledWith('bot-1', FaqStatus.ACTIVE, 10, 5);
    });

    it('should update an existing FAQ', async () => {
      const dto = { question: 'Updated question?' };
      const res = await controller.updateFaq('bot-1', 'faq-1', dto);
      expect(mockBuilderService.updateFaq).toHaveBeenCalledWith('faq-1', 'bot-1', dto);
      expect(res).toEqual({ id: 'faq-1', question: 'Updated Q?' });
    });

    it('should delete an existing FAQ successfully', async () => {
      const res = await controller.deleteFaq('bot-1', 'faq-1');
      expect(mockBuilderService.deleteFaq).toHaveBeenCalledWith('faq-1', 'bot-1');
      expect(res).toEqual({ success: true });
    });

    it('should throw NotFoundException if deleting non-existent FAQ', async () => {
      mockBuilderService.deleteFaq.mockResolvedValueOnce(false);
      await expect(controller.deleteFaq('bot-1', 'faq-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Unanswered Questions review workflow', () => {
    it('should list unanswered questions defaulting to NEW status', async () => {
      await controller.listUnansweredQuestions('bot-1', undefined, 20, 0);
      expect(mockBuilderService.listUnansweredQuestions).toHaveBeenCalledWith('bot-1', UnansweredQuestionStatus.NEW, 20, 0);
    });

    it('should resolve an unanswered question into an approved FAQ', async () => {
      const dto = {
        resolutionType: ResolutionType.APPROVED_FAQ,
        resolvedSourceUrl: 'https://store/doc',
        createFaqAnswer: 'Yes, we offer free shipping.',
        approvedBy: 'Admin Print specialist',
      };
      const res = await controller.resolveUnansweredQuestion('bot-1', 'un-1', dto);
      expect(mockBuilderService.resolveUnansweredQuestion).toHaveBeenCalledWith('un-1', 'bot-1', ResolutionType.APPROVED_FAQ, {
        resolvedSourceUrl: 'https://store/doc',
        createFaqAnswer: 'Yes, we offer free shipping.',
        approvedBy: 'Admin Print specialist',
      });
      expect(res.status).toBe(UnansweredQuestionStatus.RESOLVED);
    });
  });

  describe('listChunks', () => {
    it('should retrieve knowledge chunks', async () => {
      await controller.listChunks('bot-1', 25, 0);
      expect(mockBuilderService.listChunks).toHaveBeenCalledWith('bot-1', 25, 0);
    });
  });

  describe('Cross-Chatbot Data Isolation', () => {
    it('should throw an error if attempting to resolve an unanswered question belonging to a different chatbot', async () => {
      mockBuilderService.resolveUnansweredQuestion.mockRejectedValueOnce(new NotFoundException('Unanswered Question not found for this chatbot'));
      
      const dto = {
        resolutionType: ResolutionType.OUT_OF_SCOPE,
      };
      
      await expect(
        controller.resolveUnansweredQuestion('malicious-bot-id', 'un-1', dto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should only list FAQs for the requested chatbot', async () => {
      await controller.listFaqs('bot-1', undefined, 10, 0);
      expect(mockBuilderService.listFaqs).toHaveBeenCalledWith('bot-1', undefined, 10, 0);
      
      await controller.listFaqs('bot-2', undefined, 10, 0);
      expect(mockBuilderService.listFaqs).toHaveBeenCalledWith('bot-2', undefined, 10, 0);
    });
  });
});
