import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';
import * as ipaddr from 'ipaddr.js';

const lookupAsync = promisify(dns.lookup);

@Injectable()
export class UrlPolicyService {
  private readonly logger = new Logger(UrlPolicyService.name);

  // Blacklist of paths that typically mutate state or are sensitive
  private readonly unsafePathPatterns = [
    '/logout',
    '/signout',
    '/delete',
    '/remove',
    '/cart/add',
    '/cart/remove',
    '/checkout',
    '/payment',
    '/admin',
    '/account',
    '/reset-password',
    '/unsubscribe',
  ];

  // E-commerce catalog path patterns excluded from unstructured web crawling
  // because structured products/categories are ingested via API connectors
  private readonly defaultEcommerceExcludePatterns = [
    '/product/',
    '/products/',
    '/item/',
    '/items/',
    '/category/',
    '/categories/',
    '/shop/',
    '/store/',
    '/catalog/',
    '/collection/',
    '/collections/',
    '/p/',
    '/c/',
  ];

  /**
   * Checks if the URL path is safe and relevant to crawl.
   * Prevents crawling mutations, checkouts, admin pages, and e-commerce catalogs.
   */
  isPathSafe(urlString: string, excludeECommercePages = true, customExcludePatterns: string[] = []): boolean {
    try {
      const url = new URL(urlString);
      const path = url.pathname.toLowerCase();

      for (const pattern of this.unsafePathPatterns) {
        if (path.includes(pattern)) {
          return false;
        }
      }

      if (excludeECommercePages) {
        for (const pattern of this.defaultEcommerceExcludePatterns) {
          if (path.includes(pattern)) {
            return false;
          }
        }
      }

      for (const pattern of customExcludePatterns) {
        if (path.includes(pattern.toLowerCase())) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolves the hostname and ensures it does NOT map to a private or internal IP address.
   * Mandatory SSRF protection.
   *
   * @param hostname The hostname to check
   * @param allowLocalhost Allow localhost strictly if development mode is on, though normally blocked.
   * @returns true if safe, false if it resolves to a protected range.
   */
  async isHostnameSafe(hostname: string, allowLocalhost: boolean = false): Promise<boolean> {
    if (!hostname) return false;

    // Block raw private IP strings directly
    if (this.isPrivateIpString(hostname, allowLocalhost)) {
      return false;
    }

    try {
      // Resolve DNS
      const lookupResult = await lookupAsync(hostname);
      const address = typeof lookupResult === 'string' ? lookupResult : (lookupResult as { address?: string })?.address;
      
      if (!address) {
        return false;
      }
      return !this.isPrivateIpString(address, allowLocalhost);
    } catch (error: unknown) {
      this.logger.warn(`DNS lookup failed for ${hostname}: ${(error as Error).message}`);
      return false;
    }
  }

  private isPrivateIpString(ipString: string, allowLocalhost: boolean): boolean {
    try {
      const parsedIp = ipaddr.parse(ipString);
      const range = parsedIp.range();

      // Examples of ranges returned by ipaddr.js:
      // 'unicast', 'unspecified', 'broadcast', 'multicast', 'linkLocal', 'loopback', 'private', 'carrierGradeNat', 'ipv4Mapped', 'rfc6145', 'rfc6052', '6to4', 'teredo', 'uniqueLocal'

      if (range === 'loopback' && allowLocalhost) {
        return false; // Safe if explicitly allowed (e.g. development testing)
      }

      // We only allow standard public unicast IP addresses.
      // Block anything that is 'private', 'loopback', 'linkLocal', etc.
      const unsafeRanges = [
        'private',
        'loopback',
        'linkLocal',
        'uniqueLocal',
        'broadcast',
        'multicast',
        'carrierGradeNat',
        'unspecified'
      ];

      // Additionally block 169.254.x.x (AWS/GCP/Azure Cloud Metadata endpoints) explicitly
      // ipaddr.js typically classifies this as 'linkLocal'
      if (ipaddr.IPv4.isValid(ipString)) {
         if (ipString.startsWith('169.254.')) {
           return true;
         }
      }

      if (unsafeRanges.includes(range)) {
        return true; // It IS a private IP (i.e. unsafe)
      }

      return false; // It is safe
    } catch {
      // If we can't parse it as an IP, assume it's just a raw hostname.
      // The calling function will do a DNS lookup and pass the result back here.
      // But if it was passed here *as* an IP from DNS lookup, and fails to parse, block it.
      return false;
    }
  }
}
