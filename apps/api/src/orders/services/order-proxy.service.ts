import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConnectorFactory } from '../../connectors/connector.factory';
import { ChatbotsService } from '../../chatbots/chatbots.service';
import { OrderStatusResult, CreateOrderRequest, ReorderRequest } from '../../connectors/connector.interface';

/**
 * OrderProxyService orchestrating real-time order status lookups from merchant systems.
 * CRITICAL SECURITY & COMPLIANCE RULE: Order data is NEVER stored, persisted, or cached in our PostgreSQL databases.
 */
@Injectable()
export class OrderProxyService {
  private readonly logger = new Logger(OrderProxyService.name);

  constructor(
    private readonly connectorFactory: ConnectorFactory,
    private readonly chatbotsService: ChatbotsService,
  ) {}

  /**
   * Perform live query against client e-commerce platform via generic connector framework.
   */
  async getOrderStatus(chatbotId: string, orderId: string): Promise<OrderStatusResult | null> {
    const chatbot = await this.chatbotsService.findOne(chatbotId);
    if (!chatbot) {
      throw new NotFoundException(`Chatbot ${chatbotId} not found`);
    }

    this.logger.log(`Proxying live order status query for order #${orderId} on Chatbot ${chatbotId} (${chatbot.platformType})`);
    const connector = this.connectorFactory.create(chatbot.platformType, chatbot.connectorConfig || undefined);
    const result = await connector.getOrderStatus(orderId);
    return result;
  }

  /**
   * Create a new order on the client's e-commerce platform.
   */
  async createOrder(chatbotId: string, orderData: CreateOrderRequest): Promise<OrderStatusResult> {
    const chatbot = await this.chatbotsService.findOne(chatbotId);
    if (!chatbot) {
      throw new NotFoundException(`Chatbot ${chatbotId} not found`);
    }

    this.logger.log(`Creating live order for Chatbot ${chatbotId} (${chatbot.platformType})`);
    const connector = this.connectorFactory.create(chatbot.platformType, chatbot.connectorConfig || undefined);
    
    if (!connector.createOrder) {
      throw new Error(`Connector for ${chatbot.platformType} does not support createOrder`);
    }

    return await connector.createOrder(orderData);
  }

  /**
   * Reorder a previous order on the client's e-commerce platform.
   */
  async reorder(chatbotId: string, reorderData: ReorderRequest): Promise<OrderStatusResult> {
    const chatbot = await this.chatbotsService.findOne(chatbotId);
    if (!chatbot) {
      throw new NotFoundException(`Chatbot ${chatbotId} not found`);
    }

    this.logger.log(`Reordering source order #${reorderData.source_order_id} for Chatbot ${chatbotId} (${chatbot.platformType})`);
    const connector = this.connectorFactory.create(chatbot.platformType, chatbot.connectorConfig || undefined);
    
    if (!connector.reorder) {
      throw new Error(`Connector for ${chatbot.platformType} does not support reorder`);
    }

    return await connector.reorder(reorderData);
  }
}
