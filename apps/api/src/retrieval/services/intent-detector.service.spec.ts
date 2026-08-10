import { describe, it, expect, beforeEach } from 'vitest';
import { IntentDetectorService } from './intent-detector.service';
import { QueryIntent } from '@chatbot-platform/shared-types';

describe('IntentDetectorService', () => {
  let service: IntentDetectorService;

  beforeEach(() => {
    service = new IntentDetectorService();
  });

  it('should detect greeting intent', () => {
    expect(service.detectIntent('Hello!').intent).toBe(QueryIntent.GREETING);
    expect(service.detectIntent('good morning').intent).toBe(QueryIntent.GREETING);
  });

  it('should detect order status intent and extract order ID', () => {
    const res = service.detectIntent('Where is my order #ORD-98765?');
    expect(res.intent).toBe(QueryIntent.ORDER_STATUS);
    expect(res.entities.orderId).toBe('ORD-98765');
  });

  it('should detect product search and clean search query', () => {
    const res = service.detectIntent('Do you carry carbonless 3-part forms?');
    expect(res.intent).toBe(QueryIntent.PRODUCT_SEARCH);
    expect(res.entities.searchQuery).toBe('carbonless 3-part forms?');
  });

  it('should detect FAQ intent on shipping and return policy questions', () => {
    expect(service.detectIntent('What is your return policy?').intent).toBe(QueryIntent.FAQ);
    expect(service.detectIntent('How long does shipping take?').intent).toBe(QueryIntent.FAQ);
  });

  it('should detect contact support intent', () => {
    expect(service.detectIntent('Can I speak to a human agent?').intent).toBe(QueryIntent.CONTACT);
    expect(service.detectIntent('What is your phone number?').intent).toBe(QueryIntent.CONTACT);
  });
});
