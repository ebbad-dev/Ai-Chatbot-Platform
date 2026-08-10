import { IsOptional, IsEnum } from 'class-validator';
import { ProductSyncType } from '@chatbot-platform/shared-types';

export class TriggerSyncDto {
  @IsOptional()
  @IsEnum(ProductSyncType)
  syncType?: ProductSyncType = ProductSyncType.FULL;
}
