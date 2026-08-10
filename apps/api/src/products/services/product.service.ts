import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';
import { Product } from '../entities/product.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductData, CategoryData } from '../../connectors/connector.interface';

export interface BatchUpsertResult {
  synced: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepository: Repository<ProductCategory>,
  ) {}

  /**
   * Perform intelligent hash-based UPSERT synchronization for a batch of products.
   * Only mutates database rows when content has actually changed.
   */
  async upsertBatch(
    chatbotId: string,
    products: ProductData[],
    categories?: CategoryData[],
  ): Promise<BatchUpsertResult> {
    const result: BatchUpsertResult = {
      synced: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      failed: 0,
      errors: [],
    };

    if (!products.length) {
      return result;
    }

    // 1. Sync Categories first so we have accurate ID mappings
    const categoryMap = await this.syncCategories(chatbotId, categories || [], products);

    // 2. Fetch existing products for this batch in one query to minimize DB calls
    const externalIds = products.map((p) => p.externalId);
    const existingProducts = await this.productRepository.find({
      where: { chatbotId, externalId: In(externalIds) },
    });

    const existingMap = new Map<string, Product>();
    for (const prod of existingProducts) {
      existingMap.set(prod.externalId, prod);
    }

    const toSave: Product[] = [];
    const now = new Date();

    for (const item of products) {
      try {
        const syncHash = this.computeSyncHash(item);
        const existing = existingMap.get(item.externalId);
        const categoryId = item.categoryExternalId
          ? categoryMap.get(item.categoryExternalId) || null
          : null;

        if (!existing) {
          // CREATE NEW PRODUCT
          const newProduct = this.productRepository.create({
            chatbotId,
            externalId: item.externalId,
            name: item.name,
            description: item.description,
            price: item.price,
            compareAtPrice: item.compareAtPrice || null,
            discountPercent: item.discountPercent || null,
            currency: item.currency || 'USD',
            brand: item.brand || null,
            categoryId,
            categoryName: item.categoryName || null,
            stockQuantity: item.stockQuantity !== undefined ? item.stockQuantity : null,
            stockStatus: item.stockStatus,
            shippingInfo: item.shippingInfo || null,
            images: item.images || [],
            productUrl: item.productUrl || null,
            metadata: item.metadata || null,
            syncHash,
            lastSyncedAt: now,
          });
          toSave.push(newProduct);
          result.created++;
          result.synced++;
        } else if (existing.syncHash !== syncHash || !existing.syncHash) {
          // UPDATE EXISTING PRODUCT (hash change detected)
          existing.name = item.name;
          existing.description = item.description;
          existing.price = item.price;
          existing.compareAtPrice = item.compareAtPrice || null;
          existing.discountPercent = item.discountPercent || null;
          existing.currency = item.currency || 'USD';
          existing.brand = item.brand || null;
          existing.categoryId = categoryId;
          existing.categoryName = item.categoryName || null;
          existing.stockQuantity = item.stockQuantity !== undefined ? item.stockQuantity : null;
          existing.stockStatus = item.stockStatus;
          existing.shippingInfo = item.shippingInfo || null;
          existing.images = item.images || [];
          existing.productUrl = item.productUrl || null;
          existing.metadata = item.metadata || null;
          existing.syncHash = syncHash;
          existing.lastSyncedAt = now;

          toSave.push(existing);
          result.updated++;
          result.synced++;
        } else {
          // UNCHANGED — touch lastSyncedAt lightweight update
          existing.lastSyncedAt = now;
          toSave.push(existing);
          result.unchanged++;
          result.synced++;
        }
      } catch (err: unknown) {
        result.failed++;
        const errDesc = err instanceof Error ? err.message : String(err);
        result.errors.push(`Product ${item.externalId}: ${errDesc}`);
        this.logger.error(`Error processing product ${item.externalId}: ${errDesc}`);
      }
    }

    if (toSave.length > 0) {
      try {
        await this.productRepository.save(toSave, { chunk: 100 });
      } catch (err: unknown) {
        this.logger.error(`Database error during batch save: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }

    return result;
  }

  /**
   * Synchronize category trees and return a map of externalId -> uuid.
   */
  private async syncCategories(
    chatbotId: string,
    explicitCategories: CategoryData[],
    products: ProductData[],
  ): Promise<Map<string, string>> {
    const categoryMap = new Map<string, string>();

    // Collect unique category external IDs from explicit categories and products
    const uniqueCats = new Map<string, CategoryData>();
    for (const cat of explicitCategories) {
      uniqueCats.set(cat.externalId, cat);
    }
    for (const prod of products) {
      if (prod.categoryExternalId && !uniqueCats.has(prod.categoryExternalId)) {
        uniqueCats.set(prod.categoryExternalId, {
          externalId: prod.categoryExternalId,
          name: prod.categoryName || prod.categoryExternalId,
        });
      }
    }

    if (uniqueCats.size === 0) return categoryMap;

    const catExternalIds = Array.from(uniqueCats.keys());
    const existingCats = await this.categoryRepository.find({
      where: { chatbotId, externalId: In(catExternalIds) },
    });

    const existingMap = new Map<string, ProductCategory>();
    for (const cat of existingCats) {
      existingMap.set(cat.externalId, cat);
      categoryMap.set(cat.externalId, cat.id);
    }

    const newCatsToSave: ProductCategory[] = [];
    for (const [extId, catData] of uniqueCats.entries()) {
      if (!existingMap.has(extId)) {
        const newCat = this.categoryRepository.create({
          chatbotId,
          externalId: extId,
          name: catData.name,
          slug: catData.slug || extId,
        });
        newCatsToSave.push(newCat);
      }
    }

    if (newCatsToSave.length > 0) {
      const saved = await this.categoryRepository.save(newCatsToSave);
      for (const s of saved) {
        categoryMap.set(s.externalId, s.id);
      }
    }

    return categoryMap;
  }

  /**
   * Compute a stable SHA-256 hash of product attributes to detect actual mutations.
   */
  private computeSyncHash(item: ProductData): string {
    const normalized = {
      name: item.name,
      description: item.description || '',
      price: item.price,
      compareAtPrice: item.compareAtPrice || 0,
      currency: item.currency || 'USD',
      brand: item.brand || '',
      categoryExternalId: item.categoryExternalId || '',
      stockQuantity: item.stockQuantity !== undefined && item.stockQuantity !== null ? item.stockQuantity : -1,
      stockStatus: item.stockStatus,
      shippingInfo: item.shippingInfo || '',
      images: (item.images || []).join(','),
      url: item.productUrl || '',
      metadata: item.metadata ? JSON.stringify(item.metadata) : '',
    };

    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  }

  /**
   * Query paginated list of products for a specific chatbot.
   */
  async findProductsByChatbot(
    chatbotId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ items: Product[]; total: number }> {
    const [items, total] = await this.productRepository.findAndCount({
      where: { chatbotId },
      take: limit,
      skip: offset,
      order: { name: 'ASC' },
    });
    return { items, total };
  }

  /**
   * Get a single product by ID scoped to chatbot.
   */
  async getProduct(chatbotId: string, id: string): Promise<Product | null> {
    return this.productRepository.findOne({ where: { chatbotId, id } });
  }

  /**
   * Remove all products for a chatbot (e.g. before full re-sync if requested).
   */
  async deleteProductsByChatbot(chatbotId: string): Promise<number> {
    const result = await this.productRepository.delete({ chatbotId });
    return result.affected || 0;
  }
}
