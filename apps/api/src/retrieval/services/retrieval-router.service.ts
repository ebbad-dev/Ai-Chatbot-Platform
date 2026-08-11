import { Injectable, Logger, Optional } from '@nestjs/common';
import { IntentDetectorService, IntentDetectionResult } from './intent-detector.service';
import { Product } from '../../products/entities/product.entity';
import { ApprovedFaq } from '../../knowledge/entities/approved-faq.entity';
import { KnowledgeChunk } from '../../knowledge/entities/knowledge-chunk.entity';
import { OrderStatusResult } from '../../connectors/connector.interface';
import { QueryIntent } from '@chatbot-platform/shared-types';
import { ProductSearchService } from '../../products/services/product-search.service';
import { KnowledgeSearchService } from '../../knowledge/services/knowledge-search.service';
import { OrderProxyService } from '../../orders/services/order-proxy.service';
import * as fs from 'fs';
import * as path from 'path';

export interface MockOrderRecord {
  order_id: number | string;
  order_status_name: string;
  total: number;
  customer?: {
    email?: string;
    firstname?: string;
    lastname?: string;
    telephone?: string;
  };
  [key: string]: unknown;
}

export interface RoutedRetrievalResult {
  intent: QueryIntent;
  confidence: number;
  extractedQuery?: string;
  products: Product[];
  faqs: ApprovedFaq[];
  chunks: KnowledgeChunk[];
  orderStatus: OrderStatusResult | null;
  orderHistory?: MockOrderRecord[];
  requiresOrderNumber: boolean;
  categories?: string[];
}

/**
 * RetrievalRouterService directing visitor messages to appropriate live data connectors,
 * relational product catalogs, or semantic document chunks based on intent classification.
 */
@Injectable()
export class RetrievalRouterService {
  private readonly logger = new Logger(RetrievalRouterService.name);

  constructor(
    private readonly intentDetector: IntentDetectorService,
    private readonly productSearch: ProductSearchService,
    private readonly knowledgeSearch: KnowledgeSearchService,
    @Optional() private readonly orderProxy?: OrderProxyService,
  ) {}

  /**
   * Perform route classification and retrieve grounded data context for an incoming customer message.
   */
  async routeAndRetrieve(chatbotId: string, userMessage: string): Promise<RoutedRetrievalResult> {
    const detected: IntentDetectionResult = this.intentDetector.detectIntent(userMessage);
    this.logger.debug(
      `Detected intent ${detected.intent} (Confidence: ${detected.confidence}) for message: "${userMessage}"`,
    );

    const result: RoutedRetrievalResult = {
      intent: detected.intent,
      confidence: detected.confidence,
      extractedQuery: detected.entities.searchQuery,
      products: [],
      faqs: [],
      chunks: [],
      orderStatus: null,
      requiresOrderNumber: false,
    };

    switch (detected.intent) {
      case QueryIntent.PRODUCT_SEARCH: {
        const query = detected.entities.searchQuery || userMessage;
        const res = await this.productSearch.search(chatbotId, { query, limit: 10 });
        result.products = res.items;
        break;
      }
      case QueryIntent.FAQ: {
        const kRes = await this.knowledgeSearch.search(chatbotId, userMessage);
        result.faqs = kRes.faqs;
        result.chunks = kRes.chunks;
        break;
      }
      case QueryIntent.CATEGORY_BROWSE: {
        const categories = await this.productSearch.getCategories(chatbotId);
        (result as any).categories = categories; // attach to result
        break;
      }
      case QueryIntent.ORDER_STATUS: {
        if (!detected.entities.orderId) {
          result.requiresOrderNumber = true;
        } else {
          // Attempt 1: Fetch live order status from real connector via OrderProxyService
          if (this.orderProxy && chatbotId && chatbotId !== 'demo-key') {
            try {
              const liveStatus = await this.orderProxy.getOrderStatus(chatbotId, detected.entities.orderId);
              if (liveStatus) {
                result.orderStatus = liveStatus;
                break;
              }
            } catch (err) {
              this.logger.warn(`Live order proxy failed: ${(err as Error).message}. Attempting mock lookup fallback.`);
            }
          }

          // Attempt 2: Local mock orders JSON fallback
          try {
            const orders = this.getMockOrders();
            const match = orders.find((o) => o.order_id.toString() === detected.entities.orderId);
            if (match) {
              result.orderStatus = {
                orderId: match.order_id.toString(),
                status: match.order_status_name,
                items: [ { name: "Custom Print Order", quantity: 1, price: Number(match.total) || 45.00 } ],
                total: Number(match.total) || 45.00,
                trackingNumber: 'TRK-' + match.order_id,
              };
            }
          } catch (e) {
            this.logger.error(`Failed to read mock orders: ${(e as Error).message}`);
          }
        }
        break;
      }
      case QueryIntent.UNKNOWN: {
        if (userMessage.trim().length >= 4) {
          await this.knowledgeSearch.recordUnansweredQuestion(chatbotId, userMessage);
        }
        // Fallback semantic search to see if it's implicitly a product or policy question
        const kRes = await this.knowledgeSearch.search(chatbotId, userMessage);
        if (kRes.faqs.length > 0 || kRes.chunks.length > 0) {
          result.faqs = kRes.faqs;
          result.chunks = kRes.chunks;
        }
        const pRes = await this.productSearch.search(chatbotId, { query: userMessage, limit: 5 });
        if (pRes.items.length > 0) {
          result.products = pRes.items;
        }
        break;
      }
    }

    if (detected.entities.email) {
      try {
        const orders = this.getMockOrders();
        const matches = orders.filter((o) => o.customer?.email?.toLowerCase() === detected.entities.email?.toLowerCase());
        if (matches.length > 0) {
          result.orderHistory = matches;
        }
      } catch (e) {
        this.logger.warn(`Failed filtering order history by email: ${(e as Error).message}`);
      }
    }

    return result;
  }

  private getMockOrders(): MockOrderRecord[] {
    const possiblePaths = [
      path.resolve(process.cwd(), 'src/orders/mock-orders.json'),
      path.resolve(process.cwd(), 'apps/api/src/orders/mock-orders.json'),
      path.join(__dirname, '../../orders/mock-orders.json'),
      path.join(__dirname, '../orders/mock-orders.json'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, 'utf8')) as MockOrderRecord[];
        } catch {
          // Continue to next path
        }
      }
    }
    return [];
  }
}
