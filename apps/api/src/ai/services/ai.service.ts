import { Injectable, Inject, Logger } from '@nestjs/common';
import { AI_PROVIDER_TOKEN, AiProvider, AiCompletionRequest } from '../interfaces/ai-provider.interface';
import { PromptInjectionService } from './prompt-injection.service';
import { RetrievalRouterService } from '../../retrieval/services/retrieval-router.service';
import { PromptBuilderService, ChatMessage as RAGMessage } from '../../retrieval/services/prompt-builder.service';
import { KnowledgeSearchService } from '../../knowledge/services/knowledge-search.service';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';
import { QueryIntent } from '@chatbot-platform/shared-types';

export interface ChatSourceCitation {
  title: string;
  url: string;
}

export interface ProcessedChatReply {
  reply: string;
  sources?: ChatSourceCitation[];
  intent: string;
  confidence: number;
  fallbackTriggered: boolean;
  products?: import('@chatbot-platform/shared-types').ChatMessageProduct[];
}

/**
 * AiService orchestrating security prompt screening, grounded RAG facts extraction,
 * LLM answer synthesis, source citation formatting, and safe unknown-question telemetry.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_PROVIDER_TOKEN)
    private readonly aiProvider: AiProvider,
    private readonly promptInjectionService: PromptInjectionService,
    private readonly routerService: RetrievalRouterService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly knowledgeSearch: KnowledgeSearchService,
  ) {}

  /**
   * Process incoming visitor chat inquiry through guardrailed intelligence pipeline.
   */
  async processChatMessage(
    chatbot: Chatbot,
    message: string,
    history: Array<{ sender: 'user' | 'bot'; text: string }> = [],
  ): Promise<ProcessedChatReply> {
    const trimmedMsg = message.trim();

    // 1. Security Firewall Screening (Prompt Injection Defense)
    const securityCheck = this.promptInjectionService.checkMessage(trimmedMsg);
    if (!securityCheck.isSafe) {
      this.logger.warn(`Security check failed for chatbot ${chatbot.id} on message: "${trimmedMsg}"`);
      return {
        reply: "I am programmed solely to assist with inquiries regarding our website products, custom printing catalog, and order fulfillment SLAs. I cannot fulfill that request.",
        intent: 'security_block',
        confidence: 1.0,
        fallbackTriggered: false,
      };
    }

    // 2. RAG Route Classification & Facts Retrieval
    const retrieval = await this.routerService.routeAndRetrieve(chatbot.id, trimmedMsg);

    // 3. Prompt Assembly with Factual Guardrails
    const formattedHistory: RAGMessage[] = history.map((h) => ({
      role: h.sender === 'user' ? 'user' : 'assistant',
      content: h.text,
    }));
    
    const promptPayload = this.promptBuilder.buildPrompt(
      chatbot,
      trimmedMsg,
      retrieval,
      formattedHistory,
    );

    // 4. LLM Completion Generation
    const providerMessages: AiCompletionRequest['messages'] = promptPayload.messages.slice(1).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let aiResult = await this.aiProvider.generateCompletion({
      systemPrompt: promptPayload.systemPrompt,
      messages: providerMessages,
      temperature: 0.2,
      maxTokens: 500,
    });

    let finalReply = aiResult.content;
    let fallbackTriggered = false;

    // 7. Unknown-Answer Detection & Unanswered Question Telemetry
    const isZeroMatches =
      !retrieval.orderStatus &&
      retrieval.products.length === 0 &&
      retrieval.faqs.length === 0 &&
      retrieval.chunks.length === 0 &&
      !retrieval.requiresOrderNumber &&
      retrieval.intent === QueryIntent.UNKNOWN;

    const indicatesUnknown =
      finalReply.toLowerCase().includes("i don't have enough information") ||
      finalReply.toLowerCase().includes("not mentioned in the provided context") ||
      finalReply.toLowerCase().includes("cannot answer based on");

    if (isZeroMatches || indicatesUnknown || retrieval.confidence < 0.45) {
      fallbackTriggered = true;
      if (isZeroMatches || indicatesUnknown) {
        finalReply =
          chatbot.fallbackMessage ||
          "I don't have enough verified information in our catalog or policy docs to answer that accurately. Please reach out to our customer support specialists or check our website directly for further assistance!";
      }
      // Record unanswered question for Phase G resolution workflow
      try {
        await this.knowledgeSearch.recordUnansweredQuestion(chatbot.id, trimmedMsg);
      } catch (e: unknown) {
        this.logger.error(`Failed recording unanswered question: ${(e as Error).message}`);
      }
    }

    const sources: ChatSourceCitation[] = [];
    const seenUrls = new Set<string>();
    const returnedProducts: import('@chatbot-platform/shared-types').ChatMessageProduct[] = [];

    for (const prod of retrieval.products) {
      returnedProducts.push({
        id: prod.id || prod.externalId,
        externalId: prod.externalId,
        name: prod.name,
        price: prod.price,
        imageUrl: prod.images?.[0], // using the first image from JSON array
        url: prod.productUrl || undefined,
        description: prod.description || undefined,
        stockQuantity: prod.stockQuantity,
        stockStatus: prod.stockStatus,
        brand: prod.brand,
        categoryName: prod.categoryName,
        metadata: prod.metadata,
      });

      if (prod.productUrl && !seenUrls.has(prod.productUrl)) {
        seenUrls.add(prod.productUrl);
        sources.push({ title: prod.name, url: prod.productUrl });
      }
    }

    for (const chunk of retrieval.chunks) {
      if (chunk.sourceUrl && !seenUrls.has(chunk.sourceUrl)) {
        seenUrls.add(chunk.sourceUrl);
        const label = chunk.pageTitle ? `${chunk.pageTitle}` : 'Website Policy Document';
        sources.push({ title: label, url: chunk.sourceUrl });
      }
    }

    return {
      reply: finalReply,
      sources: sources.length > 0 ? sources : undefined,
      intent: retrieval.intent,
      confidence: retrieval.confidence,
      fallbackTriggered,
      products: returnedProducts.length > 0 ? returnedProducts : undefined,
    };
  }
}
