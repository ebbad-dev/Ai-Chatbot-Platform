import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface GeneratedChunk {
  content: string;
  headingPath: string | null;
  contentHash: string;
  chunkOrder: number;
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly MAX_CHUNK_SIZE = 1000; // max characters per chunk
  private readonly MIN_CHUNK_SIZE = 150; // merge paragraphs below this threshold

  /**
   * Split document text/markdown into semantically coherent chunks,
   * tracking Markdown heading paths and generating stable content hashes.
   */
  chunkText(text: string, defaultHeading?: string): GeneratedChunk[] {
    if (!text || !text.trim()) {
      return [];
    }

    // Split text into paragraphs or markdown blocks
    const lines = text.split(/\r?\n/);
    const chunks: GeneratedChunk[] = [];
    
    let currentHeading: string | null = defaultHeading || null;
    let currentBuffer: string[] = [];
    let currentLength = 0;
    let order = 0;

    const flushBuffer = () => {
      if (currentBuffer.length === 0) return;
      const content = currentBuffer.join('\n\n').trim();
      if (content.length > 0) {
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        chunks.push({
          content,
          headingPath: currentHeading,
          contentHash: hash,
          chunkOrder: order++,
        });
      }
      currentBuffer = [];
      currentLength = 0;
    };

    let paragraphBuffer: string[] = [];
    const flushParagraph = () => {
      if (paragraphBuffer.length === 0) return;
      const para = paragraphBuffer.join(' ').trim();
      paragraphBuffer = [];
      if (!para) return;

      if (currentLength + para.length > this.MAX_CHUNK_SIZE && currentLength >= this.MIN_CHUNK_SIZE) {
        flushBuffer();
      }

      currentBuffer.push(para);
      currentLength += para.length + 2;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        continue;
      }

      // Check for Markdown headings (e.g. "# Shipping Policy" or "### Return Terms")
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        // If we already accumulated enough text under the previous heading, flush it out
        if (currentLength > 0) {
          flushBuffer();
        }
        currentHeading = headingMatch[2].trim();
        continue;
      }

      paragraphBuffer.push(trimmed);
    }

    flushParagraph();
    flushBuffer();

    this.logger.debug(`Chunked text into ${chunks.length} sections (default heading: ${defaultHeading || 'none'})`);
    return chunks;
  }
}
