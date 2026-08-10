import { describe, it, expect, beforeEach } from 'vitest';
import { PromptBuilderService } from './prompt-builder.service';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';
import { RoutedRetrievalResult } from './retrieval-router.service';
import { QueryIntent, StockStatus } from '@chatbot-platform/shared-types';
import { Product } from '../../products/entities/product.entity';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;
  let sampleBot: Chatbot;

  beforeEach(() => {
    service = new PromptBuilderService();
    sampleBot = {
      id: 'bot-1',
      name: 'PrintEZ Assistant',
      websiteOrigin: 'https://www.printez.com',
      aiSystemPrompt: 'You are PrintEZ AI Helper. Offer kind assistance.',
    } as Chatbot;
  });

  it('should assemble grounded system prompt with anti-hallucination rules and matched product catalog', () => {
    const retrieval: RoutedRetrievalResult = {
      intent: QueryIntent.PRODUCT_SEARCH,
      confidence: 0.85,
      products: [
        {
          name: 'Carbonless Forms 3-Part',
          price: 49.99,
          currency: '$',
          stockStatus: StockStatus.IN_STOCK,
          description: 'High quality customized invoice forms.',
          productUrl: 'https://www.printez.com/forms',
        } as Product,
      ],
      faqs: [],
      chunks: [],
      orderStatus: null,
      requiresOrderNumber: false,
    };

    const built = service.buildPrompt(sampleBot, 'Show me carbonless forms', retrieval);
    expect(built.systemPrompt).toContain('You are PrintEZ AI Helper');
    expect(built.systemPrompt).toContain('CRITICAL INSTRUCTIONS & GROUNDING RULES:');
    expect(built.systemPrompt).toContain('Carbonless Forms 3-Part: Price $49.99');
    expect(built.messages).toHaveLength(2); // system + user message
    expect(built.messages[1].content).toBe('Show me carbonless forms');
  });

  it('should format real-time order status cleanly into conversation context', () => {
    const retrieval: RoutedRetrievalResult = {
      intent: QueryIntent.ORDER_STATUS,
      confidence: 0.95,
      products: [],
      faqs: [],
      chunks: [],
      orderStatus: {
        orderId: '99887',
        status: 'SHIPPED',
        total: 150.0,
        items: [{ name: 'Flyers 5000x', quantity: 1, price: 150.0 }],
        trackingNumber: 'TRACK-1234',
      },
      requiresOrderNumber: false,
    };

    const built = service.buildPrompt(sampleBot, 'Track order 99887', retrieval);
    expect(built.systemPrompt).toContain('LIVE REAL-TIME ORDER STATUS (Order #99887):');
    expect(built.systemPrompt).toContain('- Status: SHIPPED');
    expect(built.systemPrompt).toContain('- Tracking Number: TRACK-1234');
  });

  it('should incorporate conversation history when building completion pipeline', () => {
    const history = [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello! How can I help?' }] as any;
    const built = service.buildPrompt(sampleBot, 'Do you sell folders?', { intent: QueryIntent.PRODUCT_SEARCH, confidence: 0.8, products: [], faqs: [], chunks: [], orderStatus: null, requiresOrderNumber: false }, history);

    expect(built.messages).toHaveLength(4);
    expect(built.messages[1].content).toBe('Hi');
    expect(built.messages[3].content).toBe('Do you sell folders?');
  });
});
