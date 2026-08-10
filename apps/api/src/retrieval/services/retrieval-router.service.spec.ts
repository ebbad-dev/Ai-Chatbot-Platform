import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { RetrievalRouterService } from './retrieval-router.service';
import { IntentDetectorService } from './intent-detector.service';
import { ProductSearchService } from '../../products/services/product-search.service';
import { KnowledgeSearchService } from '../../knowledge/services/knowledge-search.service';
import { OrderProxyService } from '../../orders/services/order-proxy.service';
import { QueryIntent } from '@chatbot-platform/shared-types';

describe('RetrievalRouterService', () => {
  let service: RetrievalRouterService;
  let mockIntentDetector: Partial<Record<keyof IntentDetectorService, Mock>>;
  let mockProductSearch: Partial<Record<keyof ProductSearchService, Mock>>;
  let mockKnowledgeSearch: Partial<Record<keyof KnowledgeSearchService, Mock>>;
  let mockOrderProxy: Partial<Record<keyof OrderProxyService, Mock>>;

  beforeEach(() => {
    mockIntentDetector = {
      detectIntent: vi.fn().mockReturnValue({
        intent: QueryIntent.PRODUCT_SEARCH,
        confidence: 0.8,
        entities: { searchQuery: 'business cards' },
      }),
    };

    mockProductSearch = {
      search: vi.fn().mockResolvedValue({
        items: [{ id: 'prod-1', name: 'Premium Business Cards', price: 29.99 }],
        total: 1,
      }),
    };

    mockKnowledgeSearch = {
      search: vi.fn().mockResolvedValue({
        faqs: [{ id: 'faq-1', question: 'Shipping fees?', answer: 'Free above $50' }],
        chunks: [],
      }),
      recordUnansweredQuestion: vi.fn().mockResolvedValue({ id: 'un-1' }),
    };

    mockOrderProxy = {
      getOrderStatus: vi.fn().mockResolvedValue({
        orderId: '54321',
        status: 'DELIVERED',
        total: 89.0,
        items: [],
      }),
    };

    service = new RetrievalRouterService(
      mockIntentDetector as unknown as IntentDetectorService,
      mockProductSearch as unknown as ProductSearchService,
      mockKnowledgeSearch as unknown as KnowledgeSearchService,
      mockOrderProxy as unknown as OrderProxyService,
    );
  });

  it('should route product search intent to ProductSearchService', async () => {
    const res = await service.routeAndRetrieve('bot-1', 'I need business cards');

    expect(res.intent).toBe(QueryIntent.PRODUCT_SEARCH);
    expect(res.products).toHaveLength(1);
    expect(mockProductSearch.search).toHaveBeenCalledWith('bot-1', expect.objectContaining({ query: 'business cards' }));
  });

  it('should route order status intent to live OrderProxyService', async () => {
    (mockIntentDetector.detectIntent as Mock).mockReturnValue({
      intent: QueryIntent.ORDER_STATUS,
      confidence: 0.9,
      entities: { orderId: '54321' },
    });

    const res = await service.routeAndRetrieve('bot-1', 'Where is order #54321?');
    expect(res.intent).toBe(QueryIntent.ORDER_STATUS);
    expect(res.orderStatus?.status).toBe('DELIVERED');
    expect(mockOrderProxy.getOrderStatus).toHaveBeenCalledWith('bot-1', '54321');
  });

  it('should request order number if checking order status without one', async () => {
    (mockIntentDetector.detectIntent as Mock).mockReturnValue({
      intent: QueryIntent.ORDER_STATUS,
      confidence: 0.9,
      entities: {},
    });

    const res = await service.routeAndRetrieve('bot-1', 'track my package');
    expect(res.requiresOrderNumber).toBe(true);
  });

  it('should route FAQ intent to KnowledgeSearchService', async () => {
    (mockIntentDetector.detectIntent as Mock).mockReturnValue({
      intent: QueryIntent.FAQ,
      confidence: 0.85,
      entities: { searchQuery: 'shipping costs' },
    });

    const res = await service.routeAndRetrieve('bot-1', 'what are shipping costs?');
    expect(res.faqs).toHaveLength(1);
    expect(mockKnowledgeSearch.search).toHaveBeenCalled();
  });

  it('should automatically log an unanswered question when unknown intent returns zero matches', async () => {
    (mockIntentDetector.detectIntent as Mock).mockReturnValue({
      intent: QueryIntent.UNKNOWN,
      confidence: 0.3,
      entities: { searchQuery: 'xyz completely obscure query' },
    });
    (mockProductSearch.search as Mock).mockResolvedValue({ items: [], total: 0 });
    (mockKnowledgeSearch.search as Mock).mockResolvedValue({ faqs: [], chunks: [] });

    await service.routeAndRetrieve('bot-1', 'xyz completely obscure query');
    expect(mockKnowledgeSearch.recordUnansweredQuestion).toHaveBeenCalledWith('bot-1', 'xyz completely obscure query');
  });
});
