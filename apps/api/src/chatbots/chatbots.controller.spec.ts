import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotsController } from './chatbots.controller';
import { ChatbotsService } from './chatbots.service';
import { AppConfigService } from '../config/app-config.service';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ChatbotsController', () => {
  let controller: ChatbotsController;

  const mockChatbotsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addAllowedDomain: vi.fn(),
    removeAllowedDomain: vi.fn(),
  };

  const mockConfigService = {
    adminApiKey: 'secret-key-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotsController],
      providers: [
        {
          provide: ChatbotsService,
          useValue: mockChatbotsService,
        },
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<ChatbotsController>(ChatbotsController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should call service', async () => {
    const dto = { name: 'Test', websiteOrigin: 'http://test.com', welcomeMessage: 'hi', fallbackMessage: 'bye' };
    mockChatbotsService.create.mockResolvedValueOnce({ id: '1', ...dto });
    const result = await controller.create(dto);
    expect(result).toHaveProperty('id');
    expect(mockChatbotsService.create).toHaveBeenCalledWith(dto);
  });

  it('findAll should call service', async () => {
    mockChatbotsService.findAll.mockResolvedValueOnce([]);
    const result = await controller.findAll();
    expect(result).toEqual([]);
    expect(mockChatbotsService.findAll).toHaveBeenCalled();
  });
});
