import { Module, forwardRef } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { OrdersModule } from '../orders/orders.module';
import { ChatbotsModule } from '../chatbots/chatbots.module';
import { IntentDetectorService } from './services/intent-detector.service';
import { RetrievalRouterService } from './services/retrieval-router.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { RetrievalController } from './retrieval.controller';

/**
 * Retrieval Module bridging visitor intent detection, real-time connector orders,
 * structured database catalog search, and grounded LLM prompt assembly.
 */
@Module({
  imports: [ProductsModule, KnowledgeModule, OrdersModule, forwardRef(() => ChatbotsModule)],
  controllers: [RetrievalController],
  providers: [IntentDetectorService, RetrievalRouterService, PromptBuilderService],
  exports: [IntentDetectorService, RetrievalRouterService, PromptBuilderService],
})
export class RetrievalModule {}
