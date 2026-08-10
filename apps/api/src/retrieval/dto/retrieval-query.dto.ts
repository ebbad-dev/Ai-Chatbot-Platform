import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsNotEmpty()
  @IsString()
  role: 'system' | 'user' | 'assistant';

  @IsNotEmpty()
  @IsString()
  content: string;
}

export class RetrievalQueryDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}
