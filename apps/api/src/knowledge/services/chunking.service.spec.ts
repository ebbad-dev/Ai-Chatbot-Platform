import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService();
  });

  it('should return empty array for empty or whitespace-only text', () => {
    expect(service.chunkText('')).toEqual([]);
    expect(service.chunkText('   \n  ')).toEqual([]);
  });

  it('should split document text into semantic chunks and preserve heading paths', () => {
    const sampleMarkdown = `
# Shipping Policy
We offer free standard shipping on all orders above $50 within the United States. Typical delivery time is 3 to 5 business days.

For expedited orders, a standard $15 fee applies for 2-day delivery guaranteed.

## Return Terms
Customers have 30 calendar days from receipt of their shipment to request a formal Return Authorization (RA) number through our automated customer service desk.

### Refunds
Refunds are strictly issued directly back to the initial form of tender once inspected by our quality assurance warehouse team.
    `;

    const chunks = service.chunkText(sampleMarkdown, 'General Info');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].headingPath).toBe('Shipping Policy');
    expect(chunks[0].contentHash).toHaveLength(64);
    expect(chunks[0].content).toContain('free standard shipping');
    
    const returnChunk = chunks.find((c) => c.headingPath === 'Return Terms' || c.headingPath === 'Refunds');
    expect(returnChunk).toBeDefined();
  });

  it('should merge very short paragraphs below minimum threshold', () => {
    const text = 'First sentence.\n\nSecond short sentence.\n\nThird short sentence to bundle together.';
    const chunks = service.chunkText(text, 'Intro');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('First sentence.');
    expect(chunks[0].content).toContain('Third short sentence');
  });
});
