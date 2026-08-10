import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ContactRecord } from '../entities/contact-record.entity';

@Injectable()
export class ContactExtractionService {
  /**
   * Extremely simple regex-based contact extraction.
   * Extracts emails and phone numbers from raw text.
   */
  extractContacts(htmlContent: string, sourceUrl: string): Partial<ContactRecord>[] {
    const $ = cheerio.load(htmlContent);
    const text = $('body').text();
    const records: Partial<ContactRecord>[] = [];

    // Basic email regex
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const emails = Array.from(new Set(text.match(emailRegex) || []));

    emails.forEach(email => {
      records.push({
        type: 'email',
        value: email,
        normalizedValue: email.toLowerCase(),
        sourceUrl,
        priority: 10,
      });
    });

    // Basic phone regex (very naive, just for MVP)
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = Array.from(new Set(text.match(phoneRegex) || []));

    phones.forEach(phone => {
      records.push({
        type: 'phone',
        value: phone,
        normalizedValue: phone.replace(/[^0-9+]/g, ''),
        sourceUrl,
        priority: 10,
      });
    });

    // Extract mailto and tel links directly
    $('a[href^="mailto:"]').each((_, el) => {
       const href = $(el).attr('href')?.replace('mailto:', '').trim();
       if (href && !emails.includes(href)) {
         records.push({
           type: 'email',
           value: href,
           normalizedValue: href.toLowerCase(),
           sourceUrl,
           priority: 20, // higher priority for explicit links
         });
         emails.push(href);
       }
    });

    $('a[href^="tel:"]').each((_, el) => {
       const href = $(el).attr('href')?.replace('tel:', '').trim();
       if (href) {
         const norm = href.replace(/[^0-9+]/g, '');
         if (!phones.some(p => p.replace(/[^0-9+]/g, '') === norm)) {
           records.push({
             type: 'phone',
             value: href,
             normalizedValue: norm,
             sourceUrl,
             priority: 20,
           });
           phones.push(href);
         }
       }
    });

    return records;
  }
}
