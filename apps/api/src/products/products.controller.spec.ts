import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsController } from './products.controller';
import { ProductService } from './services/product.service';
import { ProductSyncService } from './services/product-sync.service';
import { ProductSearchService } from './services/product-search.service';
import { ProductSyncType } from '@chatbot-platform/shared-types';
import { ProductSortBy } from './dto/search-products.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockProductService: Partial<Record<keyof ProductService, ReturnType<typeof vi.fn>>>;
  let mockSyncService: Partial<Record<keyof ProductSyncService, ReturnType<typeof vi.fn>>>;
  let mockSearchService: Partial<Record<keyof ProductSearchService, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockProductService = {
      findProductsByChatbot: vi.fn().mockResolvedValue({ items: [{ id: 'prod-1' }], total: 1 }),
      getProduct: vi.fn().mockResolvedValue({ id: 'prod-1', name: 'Mug' }),
    };

    mockSyncService = {
      triggerSync: vi.fn().mockResolvedValue({ id: 'job-1', status: 'pending' }),
      listJobsByChatbot: vi.fn().mockResolvedValue([{ id: 'job-1' }]),
      getJobStatus: vi.fn().mockResolvedValue({ id: 'job-1', status: 'completed' }),
    };

    mockSearchService = {
      search: vi.fn().mockResolvedValue({ items: [{ id: 'prod-2', name: 'Shirt' }], total: 1, limit: 10, offset: 0 }),
    };

    controller = new ProductsController(
      mockProductService as unknown as ProductService,
      mockSyncService as unknown as ProductSyncService,
      mockSearchService as unknown as ProductSearchService,
    );
  });

  it('searchProducts should invoke productSearchService.search with DTO', async () => {
    const res = await controller.searchProducts('bot-1', { query: 'Shirt', sortBy: ProductSortBy.RELEVANCE });
    expect(mockSearchService.search).toHaveBeenCalledWith('bot-1', { query: 'Shirt', sortBy: ProductSortBy.RELEVANCE });
    expect(res.items).toHaveLength(1);
  });

  it('triggerSync should invoke productSyncService.triggerSync', async () => {
    const res = await controller.triggerSync('bot-1', { syncType: ProductSyncType.INCREMENTAL });
    expect(mockSyncService.triggerSync).toHaveBeenCalledWith('bot-1', ProductSyncType.INCREMENTAL);
    expect(res).toEqual({ id: 'job-1', status: 'pending' });
  });

  it('listSyncJobs should return recent sync tasks', async () => {
    const res = await controller.listSyncJobs('bot-1', 10);
    expect(mockSyncService.listJobsByChatbot).toHaveBeenCalledWith('bot-1', 10);
    expect(res).toHaveLength(1);
  });

  it('listProducts should query productService', async () => {
    const res = await controller.listProducts('bot-1', 20, 0);
    expect(mockProductService.findProductsByChatbot).toHaveBeenCalledWith('bot-1', 20, 0);
    expect(res.total).toBe(1);
  });
});
