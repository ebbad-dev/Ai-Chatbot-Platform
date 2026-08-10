import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';
import { ProductService } from './services/product.service';
import { ProductSyncService } from './services/product-sync.service';
import { ProductSearchService } from './services/product-search.service';
import { TriggerSyncDto } from './dto/trigger-sync.dto';
import { SearchProductsDto } from './dto/search-products.dto';

@UseGuards(InternalApiKeyGuard)
@Controller('internal/chatbots/:chatbotId/products')
export class ProductsController {
  constructor(
    private readonly productService: ProductService,
    private readonly productSyncService: ProductSyncService,
    private readonly productSearchService: ProductSearchService,
  ) {}

  @Post('search')
  async searchProducts(
    @Param('chatbotId') chatbotId: string,
    @Body() dto: SearchProductsDto,
  ) {
    return this.productSearchService.search(chatbotId, dto);
  }

  @Post('sync')
  async triggerSync(
    @Param('chatbotId') chatbotId: string,
    @Body() dto: TriggerSyncDto,
  ) {
    return this.productSyncService.triggerSync(chatbotId, dto.syncType);
  }

  @Get('sync-jobs')
  async listSyncJobs(
    @Param('chatbotId') chatbotId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.productSyncService.listJobsByChatbot(chatbotId, limit);
  }

  @Get('sync-jobs/:jobId')
  async getSyncJob(
    @Param('chatbotId') chatbotId: string,
    @Param('jobId') jobId: string,
  ) {
    const job = await this.productSyncService.getJobStatus(jobId, chatbotId);
    if (!job) {
      throw new NotFoundException(`Sync job ${jobId} not found`);
    }
    return job;
  }

  @Get()
  async listProducts(
    @Param('chatbotId') chatbotId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.productService.findProductsByChatbot(chatbotId, limit, offset);
  }

  @Get(':id')
  async getProduct(
    @Param('chatbotId') chatbotId: string,
    @Param('id') id: string,
  ) {
    const product = await this.productService.getProduct(chatbotId, id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }
}
