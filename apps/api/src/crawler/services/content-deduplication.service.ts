import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ContentDeduplicationService {
  /**
   * Generates a stable SHA-256 hash of the content string.
   */
  generateHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }
}
