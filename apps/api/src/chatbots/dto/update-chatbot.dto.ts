import { PartialType } from '@nestjs/mapped-types';
import { CreateChatbotDto } from './create-chatbot.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ChatbotStatus } from '@chatbot-platform/shared-types';

export class UpdateChatbotDto extends PartialType(CreateChatbotDto) {
  @IsEnum(ChatbotStatus)
  @IsOptional()
  status?: ChatbotStatus;
}
