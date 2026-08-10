/**
 * Shared types for the AI Chatbot Platform.
 *
 * This package provides TypeScript types, interfaces, and enums
 * used across the API, dashboard, and widget applications.
 *
 * Revised for Phase D: product sync, knowledge base, and retrieval pipeline.
 */

// ─── Enums ───────────────────────────────────────────────

export enum ChatbotStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum PlatformType {
  GENERIC = 'generic',
  OPENCART = 'opencart',
  SHOPIFY = 'shopify',
  WOOCOMMERCE = 'woocommerce',
  MAGENTO = 'magento',
  CUSTOM = 'custom',
}

export enum CrawlJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum IndexStatus {
  PENDING = 'pending',
  INDEXED = 'indexed',
  ERROR = 'error',
  SKIPPED = 'skipped',
}

export enum StockStatus {
  IN_STOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
  CALL_FOR_PRICE = 'call_for_price',
}

export enum ProductSyncJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  COMPLETED_WITH_ERRORS = 'completed_with_errors',
  FAILED = 'failed',
}

export enum ProductSyncType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
}

export enum KnowledgeSourceType {
  CRAWL = 'crawl',
  FAQ = 'faq',
  OWNER_INPUT = 'owner_input',
}

export enum UnansweredQuestionStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  OUT_OF_SCOPE = 'out_of_scope',
}

export enum ResolutionType {
  LINKED_PAGE = 'linked_page',
  APPROVED_FAQ = 'approved_faq',
  CLIENT_ACTION = 'client_action',
  OUT_OF_SCOPE = 'out_of_scope',
}

export enum ContactType {
  EMAIL = 'email',
  PHONE = 'phone',
  CONTACT_PAGE = 'contact_page',
}

export enum FaqStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum QueryIntent {
  PRODUCT_SEARCH = 'product_search',
  PRODUCT_DETAIL = 'product_detail',
  PRODUCT_PRICE = 'product_price',
  PRODUCT_COMPARE = 'product_compare',
  CATEGORY_BROWSE = 'category_browse',
  FAQ = 'faq',
  CONTACT = 'contact',
  ORDER_STATUS = 'order_status',
  CREATE_ORDER = 'create_order',
  REORDER = 'reorder',
  WEBSITE_INFO = 'website_info',
  GREETING = 'greeting',
  UNKNOWN = 'unknown',
}

// ─── API Response Types ──────────────────────────────────

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  correlationId: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Health Check Types ──────────────────────────────────

export interface HealthCheckResponse {
  status: 'ok' | 'error';
}

export interface ReadinessCheckResponse {
  status: 'ready' | 'not_ready';
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus | 'disabled';
  };
}

export type DependencyStatus = 'ok' | 'degraded' | 'error';

// ─── Chatbot Branding ────────────────────────────────────

export interface ChatbotBranding {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
  borderRadius?: number;
}

// ─── Widget & Chat Interfaces (Phase E & F) ──────────────

export interface ChatbotPublicConfig {
  publicKey: string;
  name: string;
  welcomeMessage?: string;
  fallbackMessage?: string;
  branding?: ChatbotBranding;
  platformType?: PlatformType | string;
}

export interface ChatMessageSource {
  title: string;
  url: string;
}

export interface ContactFallbackInfo {
  email?: string;
  phone?: string;
  contactUrl?: string;
}

export interface ChatMessageProduct {
  id: string | number;
  externalId?: string | number;
  name: string;
  price?: string | number;
  imageUrl?: string;
  url?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  sources?: ChatMessageSource[];
  contactFallback?: ContactFallbackInfo;
  intent?: QueryIntent | string;
  isError?: boolean;
  products?: ChatMessageProduct[];
}

export interface ChatRequest {
  publicKey: string;
  sessionId: string;
  message: string;
  history?: Array<{ sender: 'user' | 'bot'; text: string }>;
  visitorOrigin?: string;
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  sources?: ChatMessageSource[];
  contactFallback?: ContactFallbackInfo;
  intent?: QueryIntent | string;
  products?: ChatMessageProduct[];
}

export interface WidgetLoaderMessage {
  type: 'WIDGET_READY' | 'WIDGET_OPEN' | 'WIDGET_CLOSE' | 'WIDGET_RESIZE' | 'WIDGET_ERROR';
  payload?: Record<string, unknown>;
}

