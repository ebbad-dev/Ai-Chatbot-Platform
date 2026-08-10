import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { OrderProxyService } from './order-proxy.service';
import { ConnectorFactory } from '../../connectors/connector.factory';
import { ChatbotsService } from '../../chatbots/chatbots.service';
import { NotFoundException } from '@nestjs/common';

describe('OrderProxyService', () => {
  let service: OrderProxyService;
  let mockConnectorFactory: Partial<Record<keyof ConnectorFactory, Mock>>;
  let mockChatbotsService: Partial<Record<keyof ChatbotsService, Mock>>;
  let mockConnector: { getOrderStatus: Mock };

  beforeEach(() => {
    mockConnector = {
      getOrderStatus: vi.fn().mockResolvedValue({
        orderId: '12345',
        status: 'SHIPPED',
        total: 125.0,
        items: [{ name: 'Custom Brochures', quantity: 500, price: 125.0 }],
        trackingNumber: '1Z99999999',
      }),
    };

    mockConnectorFactory = {
      create: vi.fn().mockReturnValue(mockConnector),
    };

    mockChatbotsService = {
      findOne: vi.fn().mockResolvedValue({
        id: 'bot-1',
        platformType: 'opencart',
        connectorConfig: { apiBaseUrl: 'https://store.com' },
      }),
    };

    service = new OrderProxyService(
      mockConnectorFactory as unknown as ConnectorFactory,
      mockChatbotsService as unknown as ChatbotsService,
    );
  });

  it('should fetch real-time order status cleanly from connector API without saving to database', async () => {
    const status = await service.getOrderStatus('bot-1', '12345');
    
    expect(status).toBeDefined();
    expect(status?.status).toBe('SHIPPED');
    expect(status?.trackingNumber).toBe('1Z99999999');
    expect(mockConnectorFactory.create).toHaveBeenCalledWith('opencart', { apiBaseUrl: 'https://store.com' });
    expect(mockConnector.getOrderStatus).toHaveBeenCalledWith('12345');
  });

  it('should throw NotFoundException if chatbot does not exist', async () => {
    (mockChatbotsService.findOne as Mock).mockResolvedValue(null);

    await expect(service.getOrderStatus('invalid-bot', '123')).rejects.toThrow(NotFoundException);
  });
});
