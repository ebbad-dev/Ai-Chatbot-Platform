import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { ApprovedFaq } from './entities/approved-faq.entity';
import { UnansweredQuestion } from './entities/unanswered-question.entity';
import { ChunkingService } from './services/chunking.service';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { KnowledgeBuilderService } from './services/knowledge-builder.service';
import { KnowledgeController } from './knowledge.controller';

/**
 * Knowledge Module managing merchant documentation, FAQ management,
 * semantic chunking, unanswered question tracking, and high-performance hybrid database search.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeChunk, ApprovedFaq, UnansweredQuestion]),
  ],
  controllers: [KnowledgeController],
  providers: [ChunkingService, KnowledgeSearchService, KnowledgeBuilderService],
  exports: [ChunkingService, KnowledgeSearchService, KnowledgeBuilderService],
})
export class KnowledgeModule {}
