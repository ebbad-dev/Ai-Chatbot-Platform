import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductSyncJob } from './entities/product-sync-job.entity';
import { ProductService } from './services/product.service';
import { ProductSyncService } from './services/product-sync.service';
import { ProductSearchService } from './services/product-search.service';
import { ProductSyncProcessor } from './processors/product-sync.processor';
import { ProductsController } from './products.controller';
import { ChatbotsModule } from '../chatbots/chatbots.module';
import { ConnectorsModule } from '../connectors/connectors.module';

/**
 * Products domain module.
 * Manages e-commerce product synchronization, structured storage in PostgreSQL,
 * and BullMQ background job processing.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductCategory, ProductSyncJob]),
    BullModule.registerQueue({
      name: 'product-sync',
    }),
    forwardRef(() => ChatbotsModule),
    ConnectorsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductService, ProductSyncService, ProductSearchService, ProductSyncProcessor],
  exports: [ProductService, ProductSyncService, ProductSearchService],
})
export class ProductsModule {}
