import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ResolutionType } from '@chatbot-platform/shared-types';

export class ResolveQuestionDto {
  @IsNotEmpty()
  @IsEnum(ResolutionType)
  resolutionType: ResolutionType;

  @IsOptional()
  @IsString()
  createFaqAnswer?: string;

  @IsOptional()
  @IsString()
  resolvedSourceUrl?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;
}
