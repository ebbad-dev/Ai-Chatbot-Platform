import { Test, TestingModule } from '@nestjs/testing';
import { RetrievalController } from './retrieval.controller';
import { IntentDetectorService } from './services/intent-detector.service';
import { RetrievalRouterService } from './services/retrieval-router.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { ChatbotsService } from '../chatbots/chatbots.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { QueryIntent } from '@chatbot-platform/shared-types';
import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';

describe('RetrievalController', () => {
  let controller: RetrievalController;
  let mockIntentDetector: Partial<IntentDetectorService>;
  let mockRouterService: Partial<RetrievalRouterService>;
  let mockPromptBuilder: Partial<PromptBuilderService>;
  let mockChatbotsService: Partial<ChatbotsService>;

  beforeEach(async () => {
    mockIntentDetector = {
      detectIntent: vi.fn().mockReturnValue({ intent: QueryIntent.GREETING, confidence: 0.95, entities: {} }),
    };

    mockRouterService = {
      routeAndRetrieve: vi.fn().mockResolvedValue({ intent: QueryIntent.GREETING, confidence: 0.95, products: [], faqs: [], chunks: [], orderStatus: null, requiresOrderNumber: false }),
    };

    mockPromptBuilder = {
      buildPrompt: vi.fn().mockReturnValue({ systemPrompt: 'System Instruction', contextSection: 'Context', messages: [] }),
    };

    mockChatbotsService = {
      findOne: vi.fn().mockImplementation(async (id) => (id === 'bot-1' ? { id: 'bot-1', websiteOrigin: 'https://store' } : null)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RetrievalController],
      providers: [
        { provide: IntentDetectorService, useValue: mockIntentDetector },
        { provide: RetrievalRouterService, useValue: mockRouterService },
        { provide: PromptBuilderService, useValue: mockPromptBuilder },
        { provide: ChatbotsService, useValue: mockChatbotsService },
      ],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RetrievalController>(RetrievalController);
  });

  it('should detect query intent', async () => {
    const res = await controller.detectIntent({ message: 'Hello!' });
    expect(res.intent).toBe(QueryIntent.GREETING);
  });

  it('should route message and return grounded data sources', async () => {
    const res = await controller.routeAndRetrieve('bot-1', { message: 'Hi there' });
    expect(res.intent).toBe(QueryIntent.GREETING);
  });

  it('should build prompt payload for existing chatbot', async () => {
    const res = await controller.buildPrompt('bot-1', { message: 'Hello!' });
    expect(res.systemPrompt).toBe('System Instruction');
  });

  it('should throw NotFoundException if building prompt for non-existent chatbot', async () => {
    await expect(controller.buildPrompt('invalid-bot', { message: 'Hello' })).rejects.toThrow(NotFoundException);
  });
});
