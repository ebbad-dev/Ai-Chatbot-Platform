import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchKnowledgeDto {
  @IsNotEmpty()
  @IsString()
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  maxFaqs?: number = 3;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  maxChunks?: number = 5;
}
