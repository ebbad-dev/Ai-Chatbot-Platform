import { UrlPolicyService } from './url-policy.service';
import * as dns from 'dns';
import { vi, Mock } from 'vitest';

vi.mock('dns', () => ({
  lookup: vi.fn()
}));

describe('UrlPolicyService', () => {
  let service: UrlPolicyService;

  beforeEach(() => {
    service = new UrlPolicyService();
    // Default mock behavior
    (dns.lookup as unknown as Mock).mockImplementation((_hostname: string, callback: (err: Error | null, address: string, family: number) => void) => {
       callback(null, '93.184.216.34', 4); // Public IP
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should block unsafe paths', () => {
    expect(service.isPathSafe('https://example.com/logout')).toBe(false);
    expect(service.isPathSafe('https://example.com/cart/add')).toBe(false);
    expect(service.isPathSafe('https://example.com/admin/settings')).toBe(false);
    expect(service.isPathSafe('https://example.com/about-us')).toBe(true);
  });

  it('should block e-commerce product and category catalog pages by default', () => {
    expect(service.isPathSafe('https://example.com/products/carbonless-forms')).toBe(false);
    expect(service.isPathSafe('https://example.com/category/office-supplies')).toBe(false);
    expect(service.isPathSafe('https://example.com/item/12345')).toBe(false);
    expect(service.isPathSafe('https://example.com/products/carbonless-forms', false)).toBe(true);
    expect(service.isPathSafe('https://example.com/custom-page', true, ['/custom-page'])).toBe(false);
  });

  it('should block explicit private IPs without lookup', async () => {
    (dns.lookup as unknown as Mock).mockImplementation((hostname: string, callback: (err: Error | null, address: string, family: number) => void) => {
       if (hostname === 'localhost') {
           callback(null, '127.0.0.1', 4);
       } else {
           callback(null, '93.184.216.34', 4);
       }
    });

    expect(await service.isHostnameSafe('127.0.0.1')).toBe(false);
    expect(await service.isHostnameSafe('10.0.0.5')).toBe(false);
    expect(await service.isHostnameSafe('192.168.1.100')).toBe(false);
    expect(await service.isHostnameSafe('169.254.169.254')).toBe(false);
    expect(await service.isHostnameSafe('localhost')).toBe(false); // Normally blocked
  });

  it('should block resolved private IPs', async () => {
    (dns.lookup as unknown as Mock).mockImplementation((_hostname: string, callback: (err: Error | null, address: string, family: number) => void) => {
       callback(null, '10.5.5.5', 4); // Mock internal resolution
    });

    expect(await service.isHostnameSafe('internal-site.local')).toBe(false);
  });

  it('should allow public domains', async () => {
    (dns.lookup as unknown as Mock).mockImplementation((_hostname: string, callback: (err: Error | null, address: string, family: number) => void) => {
       callback(null, '93.184.216.34', 4); 
    });

    expect(await service.isHostnameSafe('example.com')).toBe(true);
  });
});
