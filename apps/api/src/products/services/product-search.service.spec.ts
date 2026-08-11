import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ProductSearchService } from './product-search.service';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductSortBy } from '../dto/search-products.dto';
import { StockStatus } from '@chatbot-platform/shared-types';

import { ProductCategory } from '../entities/product-category.entity';
import { EmbeddingService } from '../../ai/services/embedding.service';

describe('ProductSearchService', () => {
  let service: ProductSearchService;
  let mockRepo: Partial<Record<keyof Repository<Product>, Mock>>;
  let mockCategoryRepo: Partial<Record<keyof Repository<ProductCategory>, Mock>>;
  let mockEmbeddingService: Partial<Record<keyof EmbeddingService, Mock>>;
  let mockQb: Partial<Record<keyof SelectQueryBuilder<Product>, Mock>>;

  beforeEach(() => {
    mockQb = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[{ id: 'p1', name: 'Packing List Forms', price: 141.99 }], 1]),
    };

    mockRepo = {
      createQueryBuilder: vi.fn().mockReturnValue(mockQb),
    };
    
    mockCategoryRepo = {
      find: vi.fn().mockResolvedValue([{ name: 'Apparel' }, { name: 'Forms' }]),
    };
    
    mockEmbeddingService = {
      embedText: vi.fn().mockResolvedValue([0.1, 0.2]),
    };

    service = new ProductSearchService(
      mockRepo as unknown as Repository<Product>,
      mockCategoryRepo as unknown as Repository<ProductCategory>,
      mockEmbeddingService as unknown as EmbeddingService,
    );
  });

  it('should scope queries to chatbotId and apply default pagination', async () => {
    const res = await service.search('bot-123', {});

    expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('product');
    expect(mockQb.where).toHaveBeenCalledWith('product.chatbotId = :chatbotId', { chatbotId: 'bot-123' });
    expect(mockQb.take).toHaveBeenCalledWith(10);
    expect(mockQb.skip).toHaveBeenCalledWith(0);
    expect(res.total).toBe(1);
    expect(res.items[0].name).toBe('Packing List Forms');
  });

  it('should apply price thresholds and stock filters when requested', async () => {
    await service.search('bot-123', {
      minPrice: 50,
      maxPrice: 200,
      inStockOnly: true,
      category: 'Forms',
    });

    expect(mockQb.andWhere).toHaveBeenCalledWith('product.stockStatus != :outOfStock', {
      outOfStock: StockStatus.OUT_OF_STOCK,
    });
    expect(mockQb.andWhere).toHaveBeenCalledWith('product.price >= :minPrice', { minPrice: 50 });
    expect(mockQb.andWhere).toHaveBeenCalledWith('product.price <= :maxPrice', { maxPrice: 200 });
    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(product.categoryName ILIKE :category OR product.categoryId = :categoryId)',
      { category: '%Forms%', categoryId: 'Forms' },
    );
  });

  it('should formulate hybrid tsvector and pg_trgm similarity queries when free-text query is supplied', async () => {
    await service.search('bot-123', {
      query: 'carbonless forms',
      sortBy: ProductSortBy.RELEVANCE,
    });

    // Check hybrid full-text and trigram query
    expect(mockQb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('to_tsvector'),
      { query: 'carbonless forms', ilikeQuery: '%carbonless forms%' },
    );
    expect(mockQb.addSelect).toHaveBeenCalledWith(
      expect.stringContaining('ts_rank'),
      'relevance_score',
    );
    expect(mockQb.orderBy).toHaveBeenCalledWith('relevance_score', 'DESC');
  });

  it('should apply explicit price sorting option', async () => {
    await service.search('bot-123', {
      sortBy: ProductSortBy.PRICE_DESC,
    });

    expect(mockQb.orderBy).toHaveBeenCalledWith('product.price', 'DESC');
  });
});
