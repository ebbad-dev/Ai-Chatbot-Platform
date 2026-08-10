import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

@Injectable()
export class StructuredDataService {
  /**
   * Parses JSON-LD scripts in the HTML.
   */
  extractSafeJsonLd($: cheerio.CheerioAPI): Record<string, unknown>[] {
    const jsonLdBlocks: Record<string, unknown>[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (content) {
           const parsed: unknown = JSON.parse(content);
           if (Array.isArray(parsed)) {
             for (const item of parsed) {
               if (item && typeof item === 'object') {
                 jsonLdBlocks.push(item as Record<string, unknown>);
               }
             }
           } else if (parsed && typeof parsed === 'object') {
             jsonLdBlocks.push(parsed as Record<string, unknown>);
           }
        }
      } catch {
        // Silently ignore malformed JSON-LD
      }
    });

    return jsonLdBlocks;
  }
}
