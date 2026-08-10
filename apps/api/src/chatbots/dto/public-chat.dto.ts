import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryItemDto {
  @IsString()
  @IsNotEmpty()
  sender!: 'user' | 'bot';

  @IsString()
  @IsNotEmpty()
  text!: string;
}

export class PublicChatDto {
  @IsString()
  @IsOptional()
  publicKey?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];

  @IsString()
  @IsOptional()
  visitorOrigin?: string;
}
