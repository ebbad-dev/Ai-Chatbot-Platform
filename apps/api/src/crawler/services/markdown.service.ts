import { Injectable } from '@nestjs/common';
import TurndownService from 'turndown';

export interface MarkdownOptions {
  url: string;
  title: string;
  canonicalUrl: string;
  crawlDate: Date;
}

@Injectable()
export class MarkdownService {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
       headingStyle: 'atx',
       codeBlockStyle: 'fenced',
       emDelimiter: '*',
    });
    
    // Remove unwanted elements if they survived HTML cleaning
    this.turndownService.remove(['script', 'style', 'noscript', 'iframe']);
  }

  /**
   * Converts cleaned HTML to Markdown and prepends front matter.
   */
  generateMarkdown(htmlContent: string, options: MarkdownOptions): string {
    const rawMarkdown = this.turndownService.turndown(htmlContent);
    
    // Clean up excessive blank lines
    const cleanMarkdown = rawMarkdown.replace(/\n{3,}/g, '\n\n').trim();

    // Create Front Matter
    const frontMatter = `---
url: ${options.url}
canonical_url: ${options.canonicalUrl}
title: ${options.title}
last_crawled_at: ${options.crawlDate.toISOString()}
---

# ${options.title || 'Page Content'}

`;

    return frontMatter + cleanMarkdown;
  }
}
