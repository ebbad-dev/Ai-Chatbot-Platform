import { Logger } from '@nestjs/common';
import {
  IConnector,
  ProductData,
  CategoryData,
  ConnectorFetchResult,
  OrderStatusResult,
  CreateOrderRequest,
  ReorderRequest,
} from '../connector.interface';
import { ConnectorConfig } from '../types/connector.types';
import { SafeFetchService } from '../../crawler/services/safe-fetch.service';
import { StockStatus } from '@chatbot-platform/shared-types';

/**
 * OpenCart connector (PrintEZ primary integration).
 *
 * Implements the universal connector contract for OpenCart engines and custom
 * export APIs like PrintEZ. Handles both standard JSON arrays (like printez-products.json)
 * and paginated REST response objects ({ data: [...], meta: { ... } }).
 */
export class OpenCartConnector implements IConnector {
  private readonly logger = new Logger(OpenCartConnector.name);
  private readonly baseUrl: string;
  private readonly productsPath: string;
  private readonly categoriesPath: string;
  private readonly ordersPath: string;

  constructor(
    private readonly config: ConnectorConfig,
    private readonly safeFetch: SafeFetchService,
  ) {
    this.baseUrl = (this.config.apiBaseUrl || '').replace(/\/$/, '');
    if (!this.baseUrl) {
      this.logger.warn('OpenCartConnector initialized without apiBaseUrl');
    }
    this.productsPath = this.config.endpoints?.products || '/api/products';
    this.categoriesPath = this.config.endpoints?.categories || '/api/categories';
    this.ordersPath = this.config.endpoints?.orders || '/api/orders';
  }

  /**
   * Fetch a paginated batch of products from OpenCart / PrintEZ API.
   */
  async fetchProducts(page: number, limit: number): Promise<ConnectorFetchResult> {
    if (!this.baseUrl) {
      return { products: [], hasMore: false, totalCount: 0 };
    }

    const separator = this.productsPath.includes('?') ? '&' : '?';
    const targetUrl = `${this.baseUrl}${this.productsPath}${separator}page=${page}&limit=${limit}`;

    this.logger.log(`Fetching OpenCart products: page=${page}, limit=${limit} from ${targetUrl}`);

    let retries = 3;
    let delay = 2000;
    while (retries > 0) {
      try {
        const result = await this.fetchFromApi(targetUrl);
        if (result.error || result.status !== 200 || !result.content) {
          this.logger.error(`Failed to fetch OpenCart products: ${result.error || `HTTP ${result.status}`}. Retries left: ${retries - 1}`);
          retries--;
          if (retries === 0) {
            return { products: [], hasMore: false, totalCount: 0 };
          }
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // exponential backoff
          continue;
        }

        const parsed = JSON.parse(result.content);
        return this.parseProductsResponse(parsed, page, limit);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown JSON parsing error';
        this.logger.error(`Error processing OpenCart product data: ${message}`);
        return { products: [], hasMore: false, totalCount: 0 };
      }
    }
    return { products: [], hasMore: false, totalCount: 0 };
  }

  /**
   * Fetch category hierarchy from OpenCart / PrintEZ.
   */
  async fetchCategories(): Promise<CategoryData[]> {
    if (!this.baseUrl) return [];

    const targetUrl = `${this.baseUrl}${this.categoriesPath}`;
    try {
      const result = await this.fetchFromApi(targetUrl);
      if (result.error || result.status !== 200 || !result.content) {
        return [];
      }
      const parsed = JSON.parse(result.content);
      const rawArray: unknown[] = Array.isArray(parsed) ? parsed : (parsed.data as unknown[] || parsed.categories as unknown[] || []);
      
      return rawArray.map((item) => this.mapCategory(item as Record<string, unknown>)).filter(Boolean) as CategoryData[];
    } catch {
      return [];
    }
  }

  /**
   * Live order status proxy call. Never cached or stored.
   */
  async getOrderStatus(orderId: string): Promise<OrderStatusResult | null> {
    if (!this.baseUrl || !orderId) return null;

    let targetUrl: string;
    if (this.ordersPath.includes('order|get') || this.ordersPath.includes('?')) {
      const separator = this.ordersPath.includes('?') ? '&' : '?';
      targetUrl = `${this.baseUrl}${this.ordersPath}${separator}order_id=${encodeURIComponent(orderId)}`;
    } else {
      targetUrl = `${this.baseUrl}${this.ordersPath}/${encodeURIComponent(orderId)}`;
    }

    try {
      const result = await this.fetchFromApi(targetUrl);
      if (result.error || result.status !== 200 || !result.content) {
        return null;
      }
      const data = JSON.parse(result.content);
      const targetObj = (data.order || data) as Record<string, unknown>;
      return this.mapOrderStatus(targetObj, orderId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Live order status lookup failed for #${orderId}: ${msg}`);
      return null;
    }
  }

  /**
   * Create a new order via the external store API.
   */
  async createOrder(orderData: CreateOrderRequest): Promise<OrderStatusResult> {
    if (!this.baseUrl) throw new Error('No API Base URL configured');
    
    const targetUrl = `${this.baseUrl}/index.php?route=agentapi/order|insert`;
    const result = await this.postToApi(targetUrl, JSON.stringify(orderData));
    
    if (result.error || result.status !== 201 || !result.content) {
       let errMessage = result.error || `HTTP ${result.status}`;
       try {
         const parsedErr = JSON.parse(result.content);
         if (parsedErr.error?.message) errMessage = parsedErr.error.message;
       } catch {
         void 0;
       }
       this.logger.error(`Failed to create order: ${errMessage}`);
       throw new Error(errMessage);
    }
    const parsed = JSON.parse(result.content);
    return this.mapOrderStatus(parsed.order || parsed, 'pending') as OrderStatusResult;
  }

  /**
   * Reorder a past order via the external store API.
   */
  async reorder(reorderData: ReorderRequest): Promise<OrderStatusResult> {
    if (!this.baseUrl) throw new Error('No API Base URL configured');
    
    const targetUrl = `${this.baseUrl}/index.php?route=agentapi/order|reorder`;
    const result = await this.postToApi(targetUrl, JSON.stringify(reorderData));
    
    if (result.error || result.status !== 201 || !result.content) {
       let errMessage = result.error || `HTTP ${result.status}`;
       try {
         const parsedErr = JSON.parse(result.content);
         if (parsedErr.error?.message) errMessage = parsedErr.error.message;
       } catch {
         void 0;
       }
       this.logger.error(`Failed to reorder: ${errMessage}`);
       throw new Error(errMessage);
    }
    const parsed = JSON.parse(result.content);
    return this.mapOrderStatus(parsed.order || parsed, 'pending') as OrderStatusResult;
  }

  /**
   * Test connection to the OpenCart API.
   */
  async testConnection(): Promise<boolean> {
    if (!this.baseUrl) return false;
    try {
      const separator = this.productsPath.includes('?') ? '&' : '?';
      const result = await this.fetchFromApi(`${this.baseUrl}${this.productsPath}${separator}limit=1`);
      return result.status === 200 && !result.error;
    } catch {
      return false;
    }
  }

  private async fetchFromApi(targetUrl: string) {
    const authHeaders = this.getAuthHeaders();
    if (authHeaders) {
      return this.safeFetch.fetchSafe(targetUrl, this.baseUrl, authHeaders);
    }
    return this.safeFetch.fetchSafe(targetUrl, this.baseUrl);
  }

  private async postToApi(targetUrl: string, body: string) {
    const headers = this.getAuthHeaders() || {};
    headers['Content-Type'] = 'application/json';
    return this.safeFetch.postSafe(targetUrl, this.baseUrl, body, headers);
  }

  private getAuthHeaders(): Record<string, string> | undefined {
    const headers: Record<string, string> = {};
    let hasHeaders = false;

    if (this.config.apiKey) {
      const key = String(this.config.apiKey).trim();
      headers['Authorization'] = /^(bearer|basic|token)\s+/i.test(key) ? key : `Bearer ${key}`;
      hasHeaders = true;
    }
    if (this.config.apiSecret) {
      headers['X-Api-Secret'] = String(this.config.apiSecret).trim();
      hasHeaders = true;
    }

    return hasHeaders ? headers : undefined;
  }

  // ─── Helper Mappers ────────────────────────────────────────

  private parseProductsResponse(parsed: unknown, page: number, limit: number): ConnectorFetchResult {
    let rawItems: unknown[] = [];
    let totalCount: number | null = null;
    let hasMore = false;

    if (Array.isArray(parsed)) {
      // Case A: Flat array response (e.g. static JSON export like printez-products.json)
      // When flat array is returned, paginate in memory if necessary
      totalCount = parsed.length;
      const startIndex = (page - 1) * limit;
      rawItems = parsed.slice(startIndex, startIndex + limit);
      hasMore = startIndex + limit < totalCount;
    } else if (parsed && typeof parsed === 'object') {
      // Case B: Paginated response object { data: [...], meta: { total, lastPage } }
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.data)) {
        rawItems = obj.data;
      } else if (Array.isArray(obj.products)) {
        rawItems = obj.products;
      } else if (Array.isArray(obj.items)) {
        rawItems = obj.items;
      }

      const meta = (obj.meta || obj.pagination) as Record<string, unknown> | undefined;
      if (meta) {
        if (typeof meta.total === 'number') totalCount = meta.total;
        
        if (typeof meta.has_more === 'boolean') {
          hasMore = meta.has_more;
        } else if (typeof meta.total_pages === 'number') {
          hasMore = page < meta.total_pages;
        } else if (typeof meta.lastPage === 'number') {
          hasMore = page < meta.lastPage;
        } else if (typeof meta.total === 'number') {
          const actualLimit = typeof meta.limit === 'number' ? meta.limit : limit;
          hasMore = page * actualLimit < meta.total;
        }
      } else {
        // If no metadata, infer hasMore by check if full page was returned
        hasMore = rawItems.length >= limit;
      }
    }

    const products: ProductData[] = [];
    const categoriesSet = new Map<string, CategoryData>();

    for (const item of rawItems) {
      if (!item || typeof item !== 'object') continue;
      const mapped = this.mapProduct(item as Record<string, unknown>);
      if (mapped) {
        products.push(mapped);
        if (mapped.categoryName && !categoriesSet.has(mapped.categoryName)) {
          categoriesSet.set(mapped.categoryName, {
            externalId: mapped.categoryExternalId || this.toSlug(mapped.categoryName),
            name: mapped.categoryName,
            slug: this.toSlug(mapped.categoryName),
          });
        }
      }
    }

    return {
      products,
      categories: Array.from(categoriesSet.values()),
      hasMore,
      totalCount,
    };
  }

  private mapProduct(item: Record<string, unknown>): ProductData | null {
    const externalId = (item.productId || item.product_id || item.id || item.sku || '') as string;
    const name = (item.name || item.title || item.product_name || '') as string;
    if (!externalId || !name) {
      return null;
    }

    // Filter out test/garbage products from the OpenCart admin
    if (this.isTestProduct(name)) {
      this.logger.debug(`Skipping test product: "${name}" (ID: ${externalId})`);
      return null;
    }

    const priceRaw = item.price || item.unit_price || item.base_price || '$0.00';
    const price = this.parseNumericPrice(priceRaw);

    const compareRaw = item.compare_at_price || item.list_price || item.original_price || null;
    const compareAtPrice = compareRaw ? this.parseNumericPrice(compareRaw) : null;

    let discountPercent = null;
    if (compareAtPrice && compareAtPrice > price && price > 0) {
      discountPercent = parseFloat((((compareAtPrice - price) / compareAtPrice) * 100).toFixed(2));
    }

    // Extract category from multiple possible field formats
    let categoryName: string | null = (item.category || item.category_name || item.department || null) as string | null;
    let categoryExternalId: string | null = (item.category_id || null) as string | null;

    // PrintEZ: extract from `breadcrumb` array (last breadcrumb = most specific category)
    if (!categoryName && Array.isArray(item.breadcrumb) && item.breadcrumb.length > 0) {
      const lastCrumb = item.breadcrumb[item.breadcrumb.length - 1] as Record<string, unknown>;
      categoryName = (lastCrumb.name || null) as string | null;
      categoryExternalId = lastCrumb.category_id ? String(lastCrumb.category_id) : null;
    }
    // PrintEZ: extract from `category_path` string (e.g. "Business Forms > Computer Forms > ...")
    if (!categoryName && typeof item.category_path === 'string' && item.category_path) {
      const parts = (item.category_path as string).split('>').map(s => s.trim()).filter(Boolean);
      categoryName = parts[parts.length - 1] || null;
    }
    if (!categoryExternalId && categoryName) {
      categoryExternalId = this.toSlug(categoryName);
    }

    let stockStatus = StockStatus.IN_STOCK;
    const stockQuantity = typeof item.quantity === 'number' ? item.quantity : (typeof item.stock === 'number' ? item.stock : null);
    if (stockQuantity !== null && stockQuantity <= 0) {
      stockStatus = StockStatus.OUT_OF_STOCK;
    } else if (price === 0 || item.call_for_price === true) {
      stockStatus = StockStatus.CALL_FOR_PRICE;
    }

    const images: string[] = [];
    if (typeof item.image === 'string' && item.image) images.push(item.image);
    if (typeof item.thumb === 'string' && item.thumb) images.push(item.thumb);
    if (Array.isArray(item.images)) {
      item.images.forEach((img) => {
        if (typeof img === 'string' && img && !images.includes(img)) images.push(img);
        else if (img && typeof img === 'object' && typeof (img as Record<string, unknown>).url === 'string') {
          images.push((img as Record<string, unknown>).url as string);
        }
      });
    }

    // Preserve unknown platform fields in metadata
    const knownKeys = new Set([
      'productId', 'product_id', 'id', 'sku', 'name', 'title', 'product_name',
      'description', 'detailedDescription', 'price', 'unit_price', 'base_price',
      'compare_at_price', 'list_price', 'original_price', 'category', 'category_name',
      'category_id', 'department', 'quantity', 'stock', 'image', 'images', 'url', 'product_url',
      'brand', 'manufacturer', 'shipping', 'shipping_info', 'currency',
      // PrintEZ-specific known fields
      'breadcrumb', 'category_path', 'model', 'minimum_quantity',
      'price_from', 'price_source', 'description_truncated', 'call_for_price',
    ]);
    const metadata: Record<string, string | number | boolean | object | null> = {};
    let hasMetadata = false;
    for (const [key, value] of Object.entries(item)) {
      if (!knownKeys.has(key) && value !== undefined) {
        metadata[key] = (value as string | number | boolean | object | null);
        hasMetadata = true;
      }
    }
    
    // Explicitly retain model and sku in metadata since they are often queried directly
    if (item.model) {
      metadata.model = item.model as string;
      hasMetadata = true;
    }
    if (item.sku) {
      metadata.sku = item.sku as string;
      hasMetadata = true;
    }

    return {
      externalId: String(externalId),
      name: String(name),
      description: (item.detailedDescription || item.description || item.body_html || null) as string | null,
      price,
      compareAtPrice,
      discountPercent,
      currency: (item.currency as string) || 'USD',
      brand: (item.brand || item.manufacturer || null) as string | null,
      categoryExternalId: categoryExternalId ? String(categoryExternalId) : null,
      categoryName: categoryName ? String(categoryName) : null,
      stockQuantity,
      stockStatus,
      shippingInfo: (item.shipping_info || item.shipping || null) as string | null,
      images,
      productUrl: (item.url || item.product_url || null) as string | null,
      metadata: hasMetadata ? metadata : null,
    };
  }

  private mapCategory(item: Record<string, unknown>): CategoryData | null {
    const name = (item.name || item.title || item.category_name || '') as string;
    const id = (item.id || item.category_id || item.code || (name ? this.toSlug(name) : '')) as string;
    if (!id || !name) return null;

    return {
      externalId: String(id),
      name: String(name),
      slug: (item.slug as string) || this.toSlug(name),
      parentExternalId: (item.parent_id ? String(item.parent_id) : null),
    };
  }

  private mapOrderStatus(data: Record<string, unknown>, fallbackId: string): OrderStatusResult | null {
    const status = (data.status || data.order_status || data.state) as string;
    if (!status) return null;

    const itemsRaw = Array.isArray(data.items) ? data.items : (Array.isArray(data.products) ? data.products : []);
    const items = itemsRaw.map((it: unknown) => {
      const obj = (it as Record<string, unknown>) || {};
      return {
        name: String(obj.name || obj.title || 'Item'),
        quantity: typeof obj.quantity === 'number' ? obj.quantity : 1,
        price: this.parseNumericPrice(obj.price || obj.total || 0),
      };
    });

    return {
      orderId: String(data.order_id || data.id || fallbackId),
      status: String(status),
      items,
      total: this.parseNumericPrice(data.total || data.grand_total || 0),
      shippingStatus: (data.shipping_status || data.delivery_status || null) as string | null,
      trackingNumber: (data.tracking_number || data.tracking_code || null) as string | null,
      estimatedDelivery: (data.estimated_delivery || data.eta || null) as string | null,
      currency: (data.currency as string) || 'USD',
    };
  }

  private parseNumericPrice(value: unknown): number {
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : parseFloat(value.toFixed(2));
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]+/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parseFloat(parsed.toFixed(2));
    }
    return 0;
  }

  /**
   * Detect test/garbage products from the OpenCart admin that should not be synced.
   */
  private isTestProduct(name: string): boolean {
    const lower = name.toLowerCase().trim();
    // Exact matches
    if (lower === 'test' || lower === 'test33') return true;
    // Starts with "test " or "test_"
    if (/^test[\s_]/.test(lower)) return true;
    // Ends with " test"
    if (/\stest$/.test(lower)) return true;
    // Contains "test product" or "limit test"
    if (/\btest\s*product\b/.test(lower) || /\blimit\s*test\b/.test(lower)) return true;
    return false;
  }

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
