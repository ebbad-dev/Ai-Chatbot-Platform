import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { SearchProductsDto, ProductSortBy } from '../dto/search-products.dto';
import { StockStatus } from '@chatbot-platform/shared-types';
import { EmbeddingService } from '../../ai/services/embedding.service';

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ProductSearchResult {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * ProductSearchService providing high-performance hybrid database retrieval.
 * Leverages PostgreSQL GIN indexes, trigram similarity (pg_trgm), and structured filtering
 * without relying on external search engines.
 */
@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Search and filter products for a specific chatbot.
   */
  async search(chatbotId: string, dto: SearchProductsDto): Promise<ProductSearchResult> {
    this.logger.debug(`Searching products for chatbot ${chatbotId} (query: "${dto.query || ''}")`);
    const limit = dto.limit || 10;
    const offset = dto.offset || 0;

    const qb = this.productRepository.createQueryBuilder('product');
    qb.where('product.chatbotId = :chatbotId', { chatbotId });

    if (dto.inStockOnly) {
      qb.andWhere('product.stockStatus != :outOfStock', {
        outOfStock: StockStatus.OUT_OF_STOCK,
      });
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    if (dto.category) {
      qb.andWhere(
        '(product.categoryName ILIKE :category OR product.categoryId = :categoryId)',
        { category: `%${dto.category}%`, categoryId: dto.category },
      );
    }

    if (dto.query && dto.query.trim().length > 0) {
      const cleanQuery = dto.query.trim();
      const ilikeQuery = `%${cleanQuery}%`;
      
      let semanticIds: string[] = [];
      try {
        const queryEmbedding = await this.embeddingService.embedText(cleanQuery);
        // Fast in-memory semantic search across chatbot products
        const productsWithEmbeddings = await this.productRepository.query(
          'SELECT id, embedding FROM products WHERE chatbot_id = $1 AND embedding IS NOT NULL',
          [chatbotId]
        );
        
        const scoredProducts = productsWithEmbeddings.map((p: any) => ({
          id: p.id,
          score: cosineSimilarity(queryEmbedding, p.embedding)
        }));
        
        // Filter those above a semantic threshold (e.g., 0.3) and grab top 30
        scoredProducts.sort((a: any, b: any) => b.score - a.score);
        semanticIds = scoredProducts.filter((p: any) => p.score > 0.3).slice(0, 30).map((p: any) => p.id);
      } catch (err: any) {
        this.logger.warn(`Semantic search failed: ${err.message}. Falling back to keyword only.`);
      }

      const hasSemanticIds = semanticIds.length > 0;
      const safeSemanticIds = hasSemanticIds ? semanticIds : ['00000000-0000-0000-0000-000000000000']; // Dummy UUID for valid SQL syntax if empty

      // Hybrid matching: Full-text indexing + ilike fallback + pg_trgm fuzzy matching + Semantic Search
      qb.andWhere(
        `(
          to_tsvector('english', coalesce(product.name, '') || ' ' || coalesce(product.description, '')) @@ plainto_tsquery('english', :query)
          OR product.name ILIKE :ilikeQuery
          OR product.description ILIKE :ilikeQuery
          OR similarity(product.name, :query) > 0.2
          ${hasSemanticIds ? 'OR product.id IN (:...semanticIds)' : ''}
        )`,
        { query: cleanQuery, ilikeQuery, semanticIds: safeSemanticIds },
      );

      // Add relevance calculation if sorting by relevance
      if (!dto.sortBy || dto.sortBy === ProductSortBy.RELEVANCE) {
        qb.addSelect(
          `(
            ts_rank(to_tsvector('english', coalesce(product.name, '') || ' ' || coalesce(product.description, '')), plainto_tsquery('english', :query))
            + similarity(product.name, :query)
            ${hasSemanticIds ? '+ (CASE WHEN product.id IN (:...semanticIds) THEN 1.5 ELSE 0 END)' : ''}
          )`,
          'relevance_score',
        );
        qb.orderBy('relevance_score', 'DESC');
      }
    }

    // Explicit sorting options
    if (dto.sortBy === ProductSortBy.PRICE_ASC) {
      qb.orderBy('product.price', 'ASC');
    } else if (dto.sortBy === ProductSortBy.PRICE_DESC) {
      qb.orderBy('product.price', 'DESC');
    } else if (dto.sortBy === ProductSortBy.NAME_ASC || (!dto.query && (!dto.sortBy || dto.sortBy === ProductSortBy.RELEVANCE))) {
      qb.orderBy('product.name', 'ASC');
    }

    qb.take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      limit,
      offset,
    };
  }
}
