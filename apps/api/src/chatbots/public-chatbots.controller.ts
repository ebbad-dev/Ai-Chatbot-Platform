import { Controller, Get, Post, Body, Param, Headers, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ChatbotsService } from './chatbots.service';
import { AiService } from '../ai/services/ai.service';
import { ChatbotStatus } from '@chatbot-platform/shared-types';
import { PublicChatDto } from './dto/public-chat.dto';
import { Chatbot } from './entities/chatbot.entity';

@Controller('public')
export class PublicChatbotsController {
  constructor(
    private readonly chatbotsService: ChatbotsService,
    private readonly aiService: AiService,
  ) {}

  private async validateChatbotAndOrigin(publicKey: string, originHeader?: string): Promise<Chatbot> {
    const chatbot = await this.chatbotsService.findByPublicKey(publicKey);

    // Only return config or generate reply if chatbot is active
    if (chatbot.status !== ChatbotStatus.ACTIVE) {
      throw new NotFoundException('Chatbot is not active');
    }

    // Wildcard '*' means the chatbot accepts requests from any origin (open/embedded mode)
    if (chatbot.websiteOrigin === '*') {
      return chatbot;
    }

    // Enforce server-side origin validation if an origin is provided
    if (originHeader) {
      const normalizedRequestOrigin = this.chatbotsService.normalizeOrigin(originHeader);
      const isWebsiteOrigin = this.chatbotsService.normalizeOrigin(chatbot.websiteOrigin) === normalizedRequestOrigin;
      const isAllowedDomain = chatbot.allowedDomains?.some(
        (d) => d.status === 'active' && d.domain === normalizedRequestOrigin
      );

      if (!isWebsiteOrigin && !isAllowedDomain) {
        throw new UnauthorizedException('Origin is not authorized for this chatbot');
      }
    }

    return chatbot;
  }

  @Get('chatbots/:publicKey/config')
  async getConfig(@Param('publicKey') publicKey: string, @Headers('origin') originHeader?: string) {
    const chatbot = await this.validateChatbotAndOrigin(publicKey, originHeader);

    // Return safe configuration data for the widget loader, strictly omitting internal data and allowedDomains list.
    return {
      publicKey: chatbot.publicKey,
      name: chatbot.name,
      welcomeMessage: chatbot.welcomeMessage,
      fallbackMessage: chatbot.fallbackMessage,
    };
  }

  @Post(['chatbots/:publicKey/chat', 'chat'])
  async chat(
    @Body() dto: PublicChatDto,
    @Param('publicKey') paramKey?: string,
    @Headers('origin') originHeader?: string,
  ) {
    const publicKey = paramKey || dto.publicKey;
    if (!publicKey) {
      throw new BadRequestException('PublicKey is required to initiate chat');
    }

    const chatbot = await this.validateChatbotAndOrigin(publicKey, originHeader || dto.visitorOrigin);

    try {
      return await this.aiService.processChatMessage(chatbot, dto.message, dto.history);
    } catch (e: any) {
      console.error('CHAT ERROR:', e);
      throw new BadRequestException(e.message || e.toString());
    }
  }
}
