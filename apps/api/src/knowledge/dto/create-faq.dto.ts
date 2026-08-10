import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { FaqStatus } from '@chatbot-platform/shared-types';

export class CreateFaqDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsNotEmpty()
  @IsString()
  answer: string;

  @IsOptional()
  @IsEnum(FaqStatus)
  status?: FaqStatus = FaqStatus.ACTIVE;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;
}
