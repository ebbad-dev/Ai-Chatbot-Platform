import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { StructuredDataService } from './structured-data.service';
import { ImageMetadataService } from './image-metadata.service';
import { UrlNormalizationService } from './url-normalization.service';

export interface ExtractedContent {
  title: string;
  metaDescription: string;
  cleanedHtml: string;
  internalLinks: string[];
  requiresRendering: boolean;
}

@Injectable()
export class HtmlExtractionService {
  constructor(
    private readonly structuredDataService: StructuredDataService,
    private readonly imageMetadataService: ImageMetadataService,
    private readonly urlNormalization: UrlNormalizationService,
  ) {}

  /**
   * Cleans the HTML and extracts necessary metadata.
   */
  extract(htmlContent: string, baseOrigin: string): ExtractedContent {
    const $ = cheerio.load(htmlContent);

    // 1. Extract Meta
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';

    // 2. Extract internal links
    const internalLinks = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const normalized = this.urlNormalization.normalize(href, baseOrigin);
        if (normalized && this.urlNormalization.isSameOrigin(normalized, baseOrigin)) {
          internalLinks.add(normalized);
        }
      }
    });

    // 3. Extract special structural metadata before it gets cleaned
    const jsonLd = this.structuredDataService.extractSafeJsonLd($);
    const imageInfo = this.imageMetadataService.extractImageText($, baseOrigin);

    // Get text length of body before full cleaning to verify if it needs JS rendering
    const rawBodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const requiresRendering = rawBodyText.length < 150; // Below 150 chars indicates client-side rendering is likely required

    // 4. Clean HTML
    // Remove scripts, styles, noscript, iframes, etc.
    $('script, style, noscript, iframe, svg, canvas').remove();
    
    // Remove typical noise elements
    $('header, footer, nav, aside, .cookie-banner, #cookie-banner, .ads, .sidebar').remove();

    // 5. Build cleaned structure
    const bodyHtml = $('body').html() || '';
    const $clean = cheerio.load(`<div>${bodyHtml}</div>`);

    if (jsonLd.length > 0) {
      $clean('div').append('<h2>Structured Data</h2>');
      jsonLd.forEach(block => {
        const strValues = this.extractStringsFromObject(block);
        if (strValues) {
           $clean('div').append(`<p>${strValues}</p>`);
        }
      });
    }

    if (imageInfo.length > 0) {
      $clean('div').append('<h2>Image Information</h2>');
      imageInfo.forEach(info => {
         $clean('div').append(`<p>${info}</p>`);
      });
    }

    return {
      title,
      metaDescription,
      cleanedHtml: $clean.html() || '',
      internalLinks: Array.from(internalLinks),
      requiresRendering,
    };
  }

  private extractStringsFromObject(obj: unknown): string {
    if (!obj || typeof obj !== 'object') return '';
    let result = '';
    const record = obj as Record<string, unknown>;
    for (const key in record) {
       const value = record[key];
       if (typeof value === 'string' && value.trim().length > 0) {
          result += `${key}: ${value.trim()} | `;
       } else if (typeof value === 'object' && value !== null) {
          result += this.extractStringsFromObject(value);
       }
    }
    return result;
  }
}
