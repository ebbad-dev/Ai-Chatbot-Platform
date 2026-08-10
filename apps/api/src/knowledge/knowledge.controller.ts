import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { KnowledgeBuilderService } from './services/knowledge-builder.service';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { ResolveQuestionDto } from './dto/resolve-question.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';
import { FaqStatus, UnansweredQuestionStatus } from '@chatbot-platform/shared-types';

@UseGuards(InternalApiKeyGuard)
@Controller('internal/chatbots/:chatbotId/knowledge')
export class KnowledgeController {
  constructor(
    private readonly builderService: KnowledgeBuilderService,
    private readonly searchService: KnowledgeSearchService,
  ) {}

  @Post('search')
  async searchKnowledge(
    @Param('chatbotId') chatbotId: string,
    @Body() dto: SearchKnowledgeDto,
  ) {
    return this.searchService.search(chatbotId, dto.query, dto.maxFaqs, dto.maxChunks);
  }

  @Get('chunks')
  async listChunks(
    @Param('chatbotId') chatbotId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.builderService.listChunks(chatbotId, limit, offset);
  }

  @Post('faqs')
  async createFaq(
    @Param('chatbotId') chatbotId: string,
    @Body() dto: CreateFaqDto,
  ) {
    return this.builderService.createFaq(
      chatbotId,
      dto.question,
      dto.answer,
      dto.status,
      dto.sourceUrl,
      dto.approvedBy,
    );
  }

  @Get('faqs')
  async listFaqs(
    @Param('chatbotId') chatbotId: string,
    @Query('status') status?: FaqStatus,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.builderService.listFaqs(chatbotId, status, limit, offset);
  }

  @Put('faqs/:id')
  async updateFaq(
    @Param('chatbotId') chatbotId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.builderService.updateFaq(id, chatbotId, dto);
  }

  @Delete('faqs/:id')
  async deleteFaq(
    @Param('chatbotId') chatbotId: string,
    @Param('id') id: string,
  ) {
    const deleted = await this.builderService.deleteFaq(id, chatbotId);
    if (!deleted) {
      throw new NotFoundException(`FAQ ${id} not found`);
    }
    return { success: true };
  }

  @Get('unanswered-questions')
  async listUnansweredQuestions(
    @Param('chatbotId') chatbotId: string,
    @Query('status') status?: UnansweredQuestionStatus,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset = 0,
  ) {
    return this.builderService.listUnansweredQuestions(chatbotId, status || UnansweredQuestionStatus.NEW, limit, offset);
  }

  @Post('unanswered-questions/:id/resolve')
  async resolveUnansweredQuestion(
    @Param('chatbotId') chatbotId: string,
    @Param('id') id: string,
    @Body() dto: ResolveQuestionDto,
  ) {
    return this.builderService.resolveUnansweredQuestion(id, chatbotId, dto.resolutionType, {
      resolvedSourceUrl: dto.resolvedSourceUrl,
      createFaqAnswer: dto.createFaqAnswer,
      approvedBy: dto.approvedBy,
    });
  }
}
