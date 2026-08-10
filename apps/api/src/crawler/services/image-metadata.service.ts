import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

@Injectable()
export class ImageMetadataService {

  /**
   * Extracts text associated with images in the HTML.
   */
  extractImageText($: cheerio.CheerioAPI, baseOrigin: string): string[] {
    const imageInfo: string[] = [];

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (!src) return;

      const alt = $(el).attr('alt')?.trim();
      const title = $(el).attr('title')?.trim();
      
      if (alt || title) {
        // Resolve URL
        try {
          const absoluteUrl = new URL(src, baseOrigin).toString();
          
          let infoString = `Image: [URL: ${absoluteUrl}]`;
          if (alt) infoString += ` [Alt: ${alt}]`;
          if (title) infoString += ` [Title: ${title}]`;

          // Check for nearby figcaption
          const figcaption = $(el).closest('figure').find('figcaption').text().trim();
          if (figcaption) {
             infoString += ` [Caption: ${figcaption}]`;
          }

          imageInfo.push(infoString);
        } catch {
          // ignore invalid URLs
        }
      }
    });

    return imageInfo;
  }
}
