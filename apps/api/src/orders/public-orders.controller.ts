import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderProxyService } from './services/order-proxy.service';
import { CreateOrderRequest } from '../../connectors/connector.interface';

/**
 * PublicOrdersController for handling order checkout submissions directly from the widget.
 */
@Controller('v1/public/orders')
export class PublicOrdersController {
  private readonly logger = new Logger(PublicOrdersController.name);

  constructor(private readonly orderProxyService: OrderProxyService) {}

  @Post()
  async handleCheckout(@Body() createOrderDto: CreateOrderDto) {
    this.logger.log(`Received checkout submission from: ${createOrderDto.email} for chatbot: ${createOrderDto.chatbotId || 'unknown'}`);
    
    if (!createOrderDto.chatbotId) {
      throw new HttpException('Chatbot ID is required to route the order', HttpStatus.BAD_REQUEST);
    }

    try {
      // Map widget payload to universal CreateOrderRequest
      const orderRequest: CreateOrderRequest = {
        customer: {
          firstname: createOrderDto.name,
          email: createOrderDto.email,
        },
        shipping_address: {
          address_1: createOrderDto.address
        },
        products: (createOrderDto.items || []).map(item => ({
          product_id: parseInt(item.productId, 10),
          quantity: item.quantity
        }))
      };

      const result = await this.orderProxyService.createOrder(createOrderDto.chatbotId, orderRequest);

      return {
        success: true,
        message: 'Order securely received and queued for fulfillment.',
        orderId: result.orderId,
        status: result.status
      };
    } catch (err: any) {
      this.logger.error(`Checkout failed: ${err.message}`);
      throw new HttpException(`Order creation failed: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
