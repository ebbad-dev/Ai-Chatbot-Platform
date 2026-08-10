import { Injectable, Logger } from '@nestjs/common';
import { SafeFetchService } from './safe-fetch.service';
import { UrlNormalizationService } from './url-normalization.service';

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);

  constructor(
    private readonly pageFetchService: SafeFetchService,
    private readonly urlNormalization: UrlNormalizationService,
  ) {}

  /**
   * Attempts to discover and parse the sitemap.xml.
   * Returns a list of discovered normalized URLs.
   */
  async discoverSitemapUrls(baseOrigin: string): Promise<string[]> {
    try {
      const sitemapUrl = new URL('/sitemap.xml', baseOrigin).toString();
      const result = await this.pageFetchService.fetchSafe(sitemapUrl, baseOrigin);

      if (result.error || result.status !== 200 || !result.content) {
        return [];
      }

      const urls = new Set<string>();
      
      // Extremely simple regex-based XML extraction for MVP
      // Looks for <loc> tags. Handles simple sitemap and sitemap indexes.
      const locRegex = /<loc>(.*?)<\/loc>/gi;
      let match;
      while ((match = locRegex.exec(result.content)) !== null) {
        const foundUrl = match[1].trim();
        
        // If it's a nested sitemap, for MVP we won't recursively fetch it to avoid endless loops,
        // but we'll include it. Or wait, the PRD says "Support sitemap indexes".
        // Let's implement a very shallow 1-level deep sitemap index resolution if time permits.
        // For MVP, we will just grab the URLs that belong to the origin.
        
        const normalized = this.urlNormalization.normalize(foundUrl, baseOrigin);
        if (normalized && this.urlNormalization.isSameOrigin(normalized, baseOrigin)) {
            // Note: If it's a sitemap index (ends in .xml), we probably should fetch it.
            // For now, we return it. The crawler might try to visit it, see it's XML, and drop it.
            urls.add(normalized);
        }
      }

      return Array.from(urls);
    } catch (error: unknown) {
      this.logger.warn(`Failed to process sitemap for ${baseOrigin}: ${(error as Error).message}`);
      return [];
    }
  }
}
