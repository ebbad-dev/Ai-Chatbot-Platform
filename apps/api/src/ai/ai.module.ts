import { Module } from '@nestjs/common';
import { PromptInjectionService } from './services/prompt-injection.service';
import { AiService } from './services/ai.service';
import { HttpAiProvider } from './providers/http-ai.provider';
import { AI_PROVIDER_TOKEN } from './interfaces/ai-provider.interface';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [RetrievalModule, KnowledgeModule, OrdersModule],
  providers: [
    PromptInjectionService,
    AiService,
    {
      provide: AI_PROVIDER_TOKEN,
      useClass: HttpAiProvider,
    },
  ],
  exports: [AiService, PromptInjectionService, AI_PROVIDER_TOKEN],
})
export class AiModule {}
