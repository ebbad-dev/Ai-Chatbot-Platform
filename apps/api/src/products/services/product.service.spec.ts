import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from './product.service';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductData } from '../../connectors/connector.interface';
import { StockStatus } from '@chatbot-platform/shared-types';

describe('ProductService', () => {
  let service: ProductService;
  let mockProductRepo: Partial<Record<keyof Repository<Product>, ReturnType<typeof vi.fn>>>;
  let mockCategoryRepo: Partial<Record<keyof Repository<ProductCategory>, ReturnType<typeof vi.fn>>>;

  const sampleProducts: ProductData[] = [
    {
      externalId: 'SKU001',
      name: 'Premium T-Shirt',
      description: '100% Cotton T-Shirt',
      price: 29.99,
      currency: 'USD',
      stockStatus: StockStatus.IN_STOCK,
      images: ['https://img.store/shirt.png'],
      productUrl: 'https://store/shirt',
      categoryExternalId: 'apparel',
      categoryName: 'Apparel',
    },
  ];

  beforeEach(() => {
    mockProductRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((dto) => ({ id: 'uuid-1', ...dto })),
      save: vi.fn().mockImplementation((items) => Promise.resolve(items)),
      findAndCount: vi.fn().mockResolvedValue([[], 0]),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    mockCategoryRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((dto) => ({ id: 'cat-uuid-1', ...dto })),
      save: vi.fn().mockImplementation((items) => Promise.resolve(items)),
    };

    service = new ProductService(
      mockProductRepo as unknown as Repository<Product>,
      mockCategoryRepo as unknown as Repository<ProductCategory>,
    );
  });

  describe('upsertBatch', () => {
    it('should create new products when they do not already exist in DB', async () => {
      const result = await service.upsertBatch('chatbot-123', sampleProducts);

      expect(mockCategoryRepo.find).toHaveBeenCalled();
      expect(mockProductRepo.find).toHaveBeenCalledWith({
        where: { chatbotId: 'chatbot-123', externalId: expect.any(Object) },
      });
      expect(mockProductRepo.create).toHaveBeenCalled();
      expect(mockProductRepo.save).toHaveBeenCalled();
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(0);
      expect(result.synced).toBe(1);
    });

    it('should detect when product is unchanged using syncHash and skip heavy fields update', async () => {
      // Step 1: Run initial creation to capture the exact computed syncHash
      let savedProduct: Product | undefined;
      mockProductRepo.save = vi.fn().mockImplementation((items: Product[]) => {
        savedProduct = { ...items[0], id: 'existing-id-1' };
        return Promise.resolve(items);
      });

      await service.upsertBatch('chatbot-123', sampleProducts);
      expect(savedProduct).toBeDefined();
      expect(savedProduct?.syncHash).toBeDefined();

      // Step 2: Simulate second sync where DB returns the previously saved product with identical syncHash
      mockProductRepo.find = vi.fn().mockResolvedValue([savedProduct]);

      const result = await service.upsertBatch('chatbot-123', sampleProducts);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.unchanged).toBe(1); // Successfully recognized as unchanged!
    });

    it('should update product when attribute mutates and hash changes', async () => {
      mockProductRepo.find = vi.fn().mockResolvedValue([
        {
          id: 'existing-id-1',
          chatbotId: 'chatbot-123',
          externalId: 'SKU001',
          name: 'Old Name',
          price: 19.99,
          syncHash: 'old-hash-value',
        },
      ]);

      const result = await service.upsertBatch('chatbot-123', sampleProducts);

      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.synced).toBe(1);
    });
  });

  describe('findProductsByChatbot', () => {
    it('should return paginated products for chatbot', async () => {
      mockProductRepo.findAndCount = vi.fn().mockResolvedValue([[{ id: 'prod-1', name: 'Mug' }], 1]);
      const res = await service.findProductsByChatbot('bot-id', 10, 0);
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
    });
  });
});
