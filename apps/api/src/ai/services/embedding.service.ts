import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private pipelineInstance: any = null;

  async onModuleInit() {
    this.logger.log('Initializing local embedding model (Xenova/all-MiniLM-L6-v2)...');
    try {
      const transformers = await Function('return import("@xenova/transformers")')();
      
      this.pipelineInstance = await transformers.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { quantized: true }
      );
      this.logger.log('Local embedding model initialized successfully.');
    } catch (e: any) {
      this.logger.error('Failed to load local embedding model: ' + e.message, e.stack);
    }
  }

  /**
   * Generates a 384-dimensional vector for the given text.
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.pipelineInstance) {
      throw new Error('Embedding pipeline is not initialized.');
    }

    // Clean text
    const cleanText = text.replace(/\n/g, ' ').trim();
    if (!cleanText) return new Array(384).fill(0);

    const output = await this.pipelineInstance(cleanText, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}
