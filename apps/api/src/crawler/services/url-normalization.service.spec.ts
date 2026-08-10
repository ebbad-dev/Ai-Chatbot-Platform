import { UrlNormalizationService } from './url-normalization.service';

describe('UrlNormalizationService', () => {
  let service: UrlNormalizationService;

  beforeEach(() => {
    service = new UrlNormalizationService();
  });

  it('should remove fragments', () => {
    const result = service.normalize('https://example.com/page#section1');
    expect(result).toBe('https://example.com/page');
  });

  it('should remove tracking parameters', () => {
    const result = service.normalize('https://example.com/page?utm_source=google&gclid=123&keep=true');
    expect(result).toBe('https://example.com/page?keep=true');
  });

  it('should enforce lowercase hostname', () => {
    const result = service.normalize('https://EXAMPLE.com/page');
    expect(result).toBe('https://example.com/page');
  });

  it('should reject non-http/https', () => {
    const result = service.normalize('ftp://example.com');
    expect(result).toBeNull();
  });

  it('should resolve relative urls with base origin', () => {
    const result = service.normalize('/about-us', 'https://example.com');
    expect(result).toBe('https://example.com/about-us');
  });

  it('should correctly identify same origin', () => {
    expect(service.isSameOrigin('https://example.com/page1', 'https://example.com/page2')).toBe(true);
    expect(service.isSameOrigin('https://example.com', 'https://sub.example.com')).toBe(false);
  });
});
