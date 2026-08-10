import { Global, Module } from '@nestjs/common';
import { EmbeddingService } from './services/embedding.service';

@Global()
@Module({
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
