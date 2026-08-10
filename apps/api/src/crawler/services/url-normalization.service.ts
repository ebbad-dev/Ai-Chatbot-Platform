import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlNormalizationService {
  /**
   * Normalizes a URL by standardizing the protocol, removing fragments,
   * removing tracking parameters, and standardizing trailing slashes.
   */
  normalize(urlString: string, baseOrigin?: string): string | null {
    try {
      // If it's a relative URL and baseOrigin is provided, resolve it
      const url = new URL(urlString, baseOrigin);

      // Force lowercase hostname
      url.hostname = url.hostname.toLowerCase();

      // Enforce HTTP/HTTPS
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }

      // Remove fragments (hash)
      url.hash = '';

      // Remove common tracking and irrelevant parameters
      const paramsToRemove = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'wbraid',
        'gbraid',
        'ref',
        'source',
      ];

      paramsToRemove.forEach((param) => {
        url.searchParams.delete(param);
      });

      let finalUrl = url.toString();

      // Strip trailing slash if it's just the host (e.g. https://example.com/ -> https://example.com)
      // or standardize it. Standard approach is typically to remove the trailing slash for uniqueness unless it's just the origin.
      // If it's the root path '/', keep it as origin
      if (finalUrl.endsWith('/') && url.pathname.length > 1) {
        finalUrl = finalUrl.slice(0, -1);
      }

      return finalUrl;
    } catch {
      return null; // Invalid URL
    }
  }

  /**
   * Checks if two URLs are effectively the same canonical origin
   */
  isSameOrigin(urlA: string, urlB: string): boolean {
    try {
      const a = new URL(urlA);
      const b = new URL(urlB);
      return a.origin.toLowerCase() === b.origin.toLowerCase();
    } catch {
      return false;
    }
  }
}
