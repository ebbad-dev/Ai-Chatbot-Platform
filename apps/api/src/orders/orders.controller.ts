import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { OrderProxyService } from './services/order-proxy.service';

/**
 * OrdersController providing testing endpoints for live, stateless order status checkups.
 */
@UseGuards(InternalApiKeyGuard)
@Controller('internal/chatbots/:chatbotId/orders')
export class OrdersController {
  constructor(private readonly orderProxyService: OrderProxyService) {}

  @Get(':orderId/status')
  async getOrderStatus(@Param('chatbotId') chatbotId: string, @Param('orderId') orderId: string) {
    const status = await this.orderProxyService.getOrderStatus(chatbotId, orderId);
    if (!status) {
      throw new NotFoundException(`Order #${orderId} not found or status unavailable from live store API`);
    }
    return status;
  }
}
