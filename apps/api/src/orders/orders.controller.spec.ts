import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrderProxyService } from './services/order-proxy.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';

describe('OrdersController', () => {
  let controller: OrdersController;
  let mockProxyService: Partial<OrderProxyService>;

  beforeEach(async () => {
    mockProxyService = {
      getOrderStatus: vi.fn().mockImplementation(async (_botId, orderId) => {
        if (orderId === '999') return { orderId: '999', status: 'SHIPPED', total: 50.0, items: [] };
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrderProxyService, useValue: mockProxyService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should return live order status for valid order number', async () => {
    const res = await controller.getOrderStatus('bot-1', '999');
    expect(res.status).toBe('SHIPPED');
  });

  it('should throw NotFoundException if live status returned null', async () => {
    await expect(controller.getOrderStatus('bot-1', 'invalid')).rejects.toThrow(NotFoundException);
  });
});
