import { Test, TestingModule } from '@nestjs/testing';
import { PublicChatbotsController } from './public-chatbots.controller';
import { ChatbotsService } from './chatbots.service';
import { AiService } from '../ai/services/ai.service';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ChatbotStatus } from '@chatbot-platform/shared-types';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('PublicChatbotsController', () => {
  let controller: PublicChatbotsController;

  const mockChatbotsService = {
    findByPublicKey: vi.fn(),
    normalizeOrigin: vi.fn((url: string) => url.toLowerCase()),
  };

  const mockAiService = {
    processChatMessage: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicChatbotsController],
      providers: [
        { provide: ChatbotsService, useValue: mockChatbotsService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    controller = module.get<PublicChatbotsController>(PublicChatbotsController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw NotFoundException if chatbot is not active (draft)', async () => {
    mockChatbotsService.findByPublicKey.mockResolvedValueOnce({
      publicKey: 'pub_123',
      status: ChatbotStatus.DRAFT,
    });
    await expect(controller.getConfig('pub_123')).rejects.toThrow(NotFoundException);
  });

  it('should return safe config and NOT leak internal columns or allowedDomains', async () => {
    mockChatbotsService.findByPublicKey.mockResolvedValueOnce({
      id: 'internal-uuid-should-not-leak',
      publicKey: 'pub_123',
      name: 'Test',
      status: ChatbotStatus.ACTIVE,
      welcomeMessage: 'Welcome',
      fallbackMessage: 'Fallback',
      websiteOrigin: 'https://test.com',
      createdAt: new Date(),
      allowedDomains: [
        { domain: 'https://test.com', status: 'active' },
      ],
    });

    const result = await controller.getConfig('pub_123');
    expect(result).toEqual({
      publicKey: 'pub_123',
      name: 'Test',
      welcomeMessage: 'Welcome',
      fallbackMessage: 'Fallback',
    });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('allowedDomains');
    expect(result).not.toHaveProperty('websiteOrigin');
    expect(result).not.toHaveProperty('createdAt');
  });

  it('should accept request if origin is authorized', async () => {
    mockChatbotsService.findByPublicKey.mockResolvedValueOnce({
      publicKey: 'pub_123',
      status: ChatbotStatus.ACTIVE,
      websiteOrigin: 'https://main.com',
      allowedDomains: [{ domain: 'https://allowed.com', status: 'active' }],
    });

    const result = await controller.getConfig('pub_123', 'https://allowed.com');
    expect(result.publicKey).toBe('pub_123');
  });

  it('should reject request if origin is unauthorized', async () => {
    mockChatbotsService.findByPublicKey.mockResolvedValueOnce({
      publicKey: 'pub_123',
      status: ChatbotStatus.ACTIVE,
      websiteOrigin: 'https://main.com',
      allowedDomains: [{ domain: 'https://allowed.com', status: 'active' }],
    });

    await expect(controller.getConfig('pub_123', 'https://unauthorized.com')).rejects.toThrow(UnauthorizedException);
  });

  it('should process public chat message when valid publicKey and origin are provided', async () => {
    const dummyBot = {
      id: 'bot_uuid',
      publicKey: 'pub_123',
      status: ChatbotStatus.ACTIVE,
      websiteOrigin: 'https://main.com',
      allowedDomains: [],
    };
    mockChatbotsService.findByPublicKey.mockResolvedValueOnce(dummyBot);
    mockAiService.processChatMessage.mockResolvedValueOnce({
      reply: 'Hello!',
      intent: 'greeting',
      confidence: 0.99,
      fallbackTriggered: false,
    });

    const res = await controller.chat({ publicKey: 'pub_123', message: 'Hello!' });
    expect(res.reply).toBe('Hello!');
    expect(mockAiService.processChatMessage).toHaveBeenCalledWith(dummyBot, 'Hello!', undefined);
  });

  it('should throw BadRequestException on chat if publicKey is missing', async () => {
    await expect(controller.chat({ message: 'Hello!' } as any)).rejects.toThrow(BadRequestException);
  });
});
