import { StockStatus } from '@chatbot-platform/shared-types';

/**
 * Universal structured product data format.
 * All platform connectors (OpenCart, Shopify, etc.) map their proprietary
 * response schema to this unified structure.
 */
export interface ProductData {
  externalId: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  currency: string;
  brand?: string | null;
  categoryExternalId?: string | null;
  categoryName?: string | null;
  stockQuantity?: number | null;
  stockStatus: StockStatus;
  shippingInfo?: string | null;
  images: string[];
  productUrl: string | null;
  metadata?: Record<string, string | number | boolean | object | null> | null;
}

/**
 * Category structure returned by e-commerce platforms.
 */
export interface CategoryData {
  externalId: string;
  name: string;
  slug?: string | null;
  parentExternalId?: string | null;
}

/**
 * Result of fetching a page of products from a connector.
 */
export interface ConnectorFetchResult {
  products: ProductData[];
  categories?: CategoryData[];
  hasMore: boolean;
  nextCursor?: string | null;
  totalCount?: number | null;
}

/**
 * Result of a live order status query.
 * Order data is fetched real-time and NEVER stored in the database.
 */
export interface OrderStatusResult {
  orderId: string;
  status: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  shippingStatus?: string | null;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  currency?: string;
}

export interface CreateOrderRequest {
  customer: {
    customer_id?: number;
    firstname?: string;
    lastname?: string;
    email?: string;
    telephone?: string;
  };
  products: Array<{
    product_id: number;
    quantity?: number;
    options?: Array<{ product_option_id: number; product_option_value_id: number }>;
  }>;
  payment_address?: any;
  shipping_address?: any;
  comment?: string;
}

export interface ReorderRequest {
  source_order_id: number;
  customer_id?: number;
  comment?: string;
}

/**
 * Abstract interface for e-commerce connectors.
 * Implementations isolate platform-specific logic and APIs from the core chat engine.
 */
export interface IConnector {
  /**
   * Fetch a paginated batch of products from the external store API.
   * @param page 1-indexed page number
   * @param limit maximum items per page (default 500)
   */
  fetchProducts(page: number, limit: number): Promise<ConnectorFetchResult>;

  /**
   * Fetch category tree if provided by a dedicated endpoint.
   */
  fetchCategories(): Promise<CategoryData[]>;

  /**
   * Check real-time order status directly from the client's system.
   */
  getOrderStatus(orderId: string): Promise<OrderStatusResult | null>;

  /**
   * Create a new order via the external store API.
   */
  createOrder(orderData: CreateOrderRequest): Promise<OrderStatusResult>;

  /**
   * Reorder a past order via the external store API.
   */
  reorder(reorderData: ReorderRequest): Promise<OrderStatusResult>;

  /**
   * Test API reachability and credentials.
   */
  testConnection(): Promise<boolean>;
}
