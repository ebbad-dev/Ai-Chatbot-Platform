import { Controller, Post, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { IntentDetectorService } from './services/intent-detector.service';
import { RetrievalRouterService } from './services/retrieval-router.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { ChatbotsService } from '../chatbots/chatbots.service';
import { RetrievalQueryDto } from './dto/retrieval-query.dto';

@UseGuards(InternalApiKeyGuard)
@Controller('internal/chatbots/:chatbotId/retrieval')
export class RetrievalController {
  constructor(
    private readonly intentDetector: IntentDetectorService,
    private readonly routerService: RetrievalRouterService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly chatbotsService: ChatbotsService,
  ) {}

  @Post('detect-intent')
  async detectIntent(@Body() dto: RetrievalQueryDto) {
    return this.intentDetector.detectIntent(dto.message);
  }

  @Post('route')
  async routeAndRetrieve(@Param('chatbotId') chatbotId: string, @Body() dto: RetrievalQueryDto) {
    return this.routerService.routeAndRetrieve(chatbotId, dto.message);
  }

  @Post('build-prompt')
  async buildPrompt(@Param('chatbotId') chatbotId: string, @Body() dto: RetrievalQueryDto) {
    const chatbot = await this.chatbotsService.findOne(chatbotId);
    if (!chatbot) {
      throw new NotFoundException(`Chatbot ${chatbotId} not found`);
    }

    const retrieved = await this.routerService.routeAndRetrieve(chatbotId, dto.message);
    return this.promptBuilder.buildPrompt(chatbot, dto.message, retrieved, dto.history || []);
  }
}
