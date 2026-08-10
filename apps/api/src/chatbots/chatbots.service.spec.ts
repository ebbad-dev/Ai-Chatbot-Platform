import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotsService } from './chatbots.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Chatbot } from './entities/chatbot.entity';
import { AllowedDomain } from './entities/allowed-domain.entity';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppConfigService } from '../config/app-config.service';

describe('ChatbotsService', () => {
  let service: ChatbotsService;

  const mockChatbotRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((chatbot) => Promise.resolve({ id: '1', ...chatbot })),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    merge: vi.fn(),
    remove: vi.fn(),
  };

  const mockAllowedDomainRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((domain) => Promise.resolve({ id: '1', ...domain })),
    findOne: vi.fn(),
    remove: vi.fn(),
  };

  const mockConfigService = {
    isDevelopment: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotsService,
        {
          provide: getRepositoryToken(Chatbot),
          useValue: mockChatbotRepository,
        },
        {
          provide: getRepositoryToken(AllowedDomain),
          useValue: mockAllowedDomainRepository,
        },
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ChatbotsService>(ChatbotsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a chatbot with a 32-byte public key', async () => {
      const dto = {
        name: 'Test Bot',
        websiteOrigin: 'http://localhost',
        welcomeMessage: 'Hi',
        fallbackMessage: 'Bye',
      };
      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('publicKey');
      // 32 bytes hex = 64 chars + 8 chars for 'bot_pub_' = 72 chars
      expect(result.publicKey.length).toBe(72);
      expect(result.publicKey).toMatch(/^bot_pub_[0-9a-f]{64}$/);
    });
  });

  describe('domain normalization', () => {
    it('should normalize valid domains', () => {
      expect(service.normalizeOrigin('example.com')).toBe('https://example.com');
      expect(service.normalizeOrigin('http://EXAMPLE.com/path?q=1')).toBe('http://example.com');
      expect(service.normalizeOrigin('https://sub.domain.com:8080/')).toBe('https://sub.domain.com:8080');
    });

    it('should reject non-http protocols', () => {
      expect(() => service.normalizeOrigin('ftp://example.com')).toThrow(BadRequestException);
    });

    it('should allow localhost in development', () => {
      mockConfigService.isDevelopment = true;
      expect(service.normalizeOrigin('localhost:3000')).toBe('https://localhost:3000');
    });

    it('should reject localhost in production', () => {
      mockConfigService.isDevelopment = false;
      expect(() => service.normalizeOrigin('localhost:3000')).toThrow(BadRequestException);
      mockConfigService.isDevelopment = true; // reset
    });
  });

  describe('addAllowedDomain', () => {
    it('should add a new allowed domain with normalization', async () => {
      mockChatbotRepository.findOne.mockResolvedValueOnce({ id: '1' });
      mockAllowedDomainRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.addAllowedDomain('1', { domain: 'http://EXAMPLE.com/path' });
      expect(result).toHaveProperty('domain', 'http://example.com');
    });

    it('should throw ConflictException if normalized domain already exists', async () => {
      mockChatbotRepository.findOne.mockResolvedValueOnce({ id: '1' });
      mockAllowedDomainRepository.findOne.mockResolvedValueOnce({ id: 'domain-id' });

      await expect(service.addAllowedDomain('1', { domain: 'example.com' })).rejects.toThrow(ConflictException);
    });
  });
  
  describe('removeAllowedDomain', () => {
    it('should throw if Bot A tries to remove Bot B domain', async () => {
      // Find one returns null because it checks chatbot.id
      mockAllowedDomainRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.removeAllowedDomain('bot-A-id', 'bot-B-domain-id')).rejects.toThrow(NotFoundException);
    });
  });
});

