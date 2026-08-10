import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ChatbotsService } from './chatbots.service';
import { CreateChatbotDto } from './dto/create-chatbot.dto';
import { UpdateChatbotDto } from './dto/update-chatbot.dto';
import { CreateAllowedDomainDto } from './dto/create-allowed-domain.dto';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';

@UseGuards(InternalApiKeyGuard)
@Controller('internal/chatbots')
export class ChatbotsController {
  constructor(private readonly chatbotsService: ChatbotsService) {}

  @Post()
  create(@Body() createChatbotDto: CreateChatbotDto) {
    return this.chatbotsService.create(createChatbotDto);
  }

  @Get()
  findAll() {
    return this.chatbotsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatbotsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChatbotDto: UpdateChatbotDto) {
    return this.chatbotsService.update(id, updateChatbotDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chatbotsService.remove(id);
  }

  // --- Allowed Domains ---

  @Post(':id/domains')
  addDomain(
    @Param('id') id: string,
    @Body() createAllowedDomainDto: CreateAllowedDomainDto,
  ) {
    return this.chatbotsService.addAllowedDomain(id, createAllowedDomainDto);
  }

  @Delete(':id/domains/:domainId')
  removeDomain(@Param('id') id: string, @Param('domainId') domainId: string) {
    return this.chatbotsService.removeAllowedDomain(id, domainId);
  }
}
