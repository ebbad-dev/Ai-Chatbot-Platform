import { IsOptional, IsString, IsEnum } from 'class-validator';
import { FaqStatus } from '@chatbot-platform/shared-types';

export class UpdateFaqDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsEnum(FaqStatus)
  status?: FaqStatus;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;
}
