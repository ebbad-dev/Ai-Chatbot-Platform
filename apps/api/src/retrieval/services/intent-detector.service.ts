import { Injectable, Logger } from '@nestjs/common';
import { QueryIntent } from '@chatbot-platform/shared-types';

export interface DetectedEntities {
  orderId?: string;
  searchQuery?: string;
  category?: string;
  email?: string;
}

export interface IntentDetectionResult {
  intent: QueryIntent;
  confidence: number;
  entities: DetectedEntities;
}

/**
 * IntentDetectorService utilizing low-latency keyword heuristics, regex pattern matching,
 * and linguistic analysis to categorize user queries and extract actionable entities (e.g., order IDs).
 */
@Injectable()
export class IntentDetectorService {
  private readonly logger = new Logger(IntentDetectorService.name);

  // Regex for extracting order IDs (e.g. #12345, ORD-9988, order 54321)
  private readonly orderIdRegex = /(?:order|ord|tracking|reference|#|id)\s*[:#-]?\s*([a-zA-Z0-9-]{4,15})/i;

  detectIntent(message: string): IntentDetectionResult {
    const text = (message || '').trim().toLowerCase();
    const entities: DetectedEntities = {};

    if (!text) {
      return { intent: QueryIntent.UNKNOWN, confidence: 0, entities };
    }
    this.logger.verbose(`Analyzing query intent for: "${message}"`);

    // 1. Check for Greetings
    if (/^(hello|hi|hey|good (morning|afternoon|evening)|howdy|greetings)[!.,? ]*$/i.test(text)) {
      return { intent: QueryIntent.GREETING, confidence: 0.95, entities };
    }

    // 3.5 Check for Email Address
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
    if (emailMatch && emailMatch[1]) {
      entities.email = emailMatch[1];
    }

    // 2. Check for Order Status Intent
    const orderMatch = text.match(this.orderIdRegex);
    if (orderMatch || /order status|track (my|an) (order|package)|where is my (order|package|shipment)|has my order shipped/i.test(text)) {
      if (orderMatch && orderMatch[1]) {
        entities.orderId = orderMatch[1].replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
      } else {
        // Fallback numerical check if "order" word appeared in general query
        const numMatch = text.match(/\b\d{4,10}\b/);
        if (numMatch) {
          entities.orderId = numMatch[0];
        }
      }
      return { intent: QueryIntent.ORDER_STATUS, confidence: 0.9, entities };
    }

    // 3. Check for Contact / Human Support Intent
    if (/contact|phone|email|support|customer service|speak (to|with) (a |an )?(human|person|agent|specialist|representative)|call us|reach someone/i.test(text)) {
      return { intent: QueryIntent.CONTACT, confidence: 0.9, entities };
    }

    // 4. Check for FAQ & Policy Intent (EXPANDED to cover shipping, turnaround, tax, rewards, delivery)
    if (/return policy|refund|shipping|turnaround|delivery|deliver|tax|free shipping|ground shipping|next day|two day|expedited|overnight|warranty|guarantee|terms|how long does|business hours|location|address|ez rewards|rewards program|sales tax|transit time|handling time|production time|lead time/i.test(text)) {
      entities.searchQuery = message.trim();
      return { intent: QueryIntent.FAQ, confidence: 0.85, entities };
    }

    // 5. Check for Price / Discount Queries
    if (/how much|price|cost|pricing|discount|coupon|promo|bulk rates|wholesale/i.test(text)) {
      entities.searchQuery = this.cleanSearchQuery(message);
      return { intent: QueryIntent.PRODUCT_PRICE, confidence: 0.85, entities };
    }

    // 6. Check for Product Compare
    if (/compare|difference between|versus|vs\.?|which is better/i.test(text)) {
      entities.searchQuery = message.trim();
      return { intent: QueryIntent.PRODUCT_COMPARE, confidence: 0.85, entities };
    }

    // 7. Check for Category Browse
    if (/show me all|list of|browse|catalog|categories|types of|what kinds? of/i.test(text)) {
      entities.searchQuery = this.cleanSearchQuery(message);
      return { intent: QueryIntent.CATEGORY_BROWSE, confidence: 0.8, entities };
    }

    // 8. Check for Reorder Intent
    if (/reorder|order again|buy again|repeat order/i.test(text)) {
      const orderMatch = text.match(/#?([a-z0-9-]{5,10})/i);
      if (orderMatch && orderMatch[1]) {
        entities.orderId = orderMatch[1].toUpperCase();
      }
      return { intent: QueryIntent.REORDER, confidence: 0.9, entities };
    }

    // 9. Check for Create Order Intent
    if (/place (an|a new)? order|buy (this|now)|purchase|add to cart/i.test(text)) {
      entities.searchQuery = this.cleanSearchQuery(message);
      return { intent: QueryIntent.CREATE_ORDER, confidence: 0.85, entities };
    }

    // 10. Product Search / Details (default actionable query — requires minimum substance)
    if (/do you (have|carry|sell|offer|make)|looking for|need|search for|find|show me/i.test(text) || text.length >= 5) {
      entities.searchQuery = this.cleanSearchQuery(message);
      return { intent: QueryIntent.PRODUCT_SEARCH, confidence: 0.75, entities };
    }

    return { intent: QueryIntent.UNKNOWN, confidence: 0.4, entities: { searchQuery: message.trim() } };
  }

  private cleanSearchQuery(raw: string): string {
    return raw
      .replace(/(?:do you (?:have|carry|sell|offer)|show me|looking for|i need|search for|find|price for|cost of)\s*/gi, '')
      .trim();
  }
}
