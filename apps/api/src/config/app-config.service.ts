import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized, typed access to validated environment variables.
 *
 * The ConfigService from @nestjs/config reads from process.env,
 * but this wrapper provides type-safe accessor methods so the rest
 * of the application never parses raw env strings directly.
 *
 * Required variables fail fast with a clear error message.
 * Redis variables are only required when REDIS_ENABLED=true.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {
    this.validate();
  }

  get nodeEnv(): string {
    return this.getRequired('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get port(): number {
    return parseInt(this.getRequired('PORT'), 10);
  }

  get apiBaseUrl(): string {
    return this.getRequired('API_BASE_URL');
  }

  get adminApiKey(): string {
    return this.getRequired('ADMIN_API_KEY');
  }

  // ─── Database ────────────────────────────────────────

  get databaseHost(): string {
    return this.getRequired('DATABASE_HOST');
  }

  get databasePort(): number {
    return parseInt(this.getRequired('DATABASE_PORT'), 10);
  }

  get databaseName(): string {
    return this.getRequired('DATABASE_NAME');
  }

  get databaseUser(): string {
    return this.getRequired('DATABASE_USER');
  }

  get databasePassword(): string {
    return this.getRequired('DATABASE_PASSWORD');
  }

  get databaseSsl(): boolean {
    return this.configService.get<string>('DATABASE_SSL') === 'true';
  }

  get databaseLogging(): boolean {
    return this.configService.get<string>('DATABASE_LOGGING') === 'true';
  }

  // ─── Redis (optional — only required when REDIS_ENABLED=true) ───

  get redisEnabled(): boolean {
    return this.configService.get<string>('REDIS_ENABLED') === 'true';
  }

  get redisHost(): string {
    if (!this.redisEnabled) return '';
    return this.getRequired('REDIS_HOST');
  }

  get redisPort(): number {
    if (!this.redisEnabled) return 6379;
    return parseInt(this.getRequired('REDIS_PORT'), 10);
  }

  get redisPassword(): string {
    return this.configService.get<string>('REDIS_PASSWORD') || '';
  }

  get redisDb(): number {
    return parseInt(this.configService.get<string>('REDIS_DB') || '0', 10);
  }

  // ─── CORS ────────────────────────────────────────────

  get corsOrigins(): string | string[] {
    const origins = this.configService.get<string>('CORS_ORIGINS') || '';
    if (origins.trim() === '*') {
      return '*';
    }
    return origins
      .split(',')
      .map((o: string) => o.trim())
      .filter(Boolean);
  }

  // ─── AI Provider Keys (Optional) ─────────────────────

  private getCleanKey(key: string): string {
    const val = this.configService.get<string>(key) || '';
    return val.replace(/^["']|["']$/g, '').trim();
  }

  get geminiApiKey(): string {
    return this.getCleanKey('GEMINI_API_KEY');
  }

  get groqApiKey(): string {
    return this.getCleanKey('GROQ_API_KEY');
  }

  get openRouterApiKey(): string {
    return this.getCleanKey('OPENROUTER_API_KEY');
  }

  // ─── Crawler Limits ───────────────────────────────────

  get crawlerAllowTestLoopback(): boolean {
    return this.configService.get<string>('CRAWLER_ALLOW_TEST_LOOPBACK') === 'true';
  }

  get crawlerMaxPages(): number {
    return parseInt(this.configService.get<string>('CRAWLER_MAX_PAGES') || '50', 10);
  }

  get crawlerMaxDepth(): number {
    return parseInt(this.configService.get<string>('CRAWLER_MAX_DEPTH') || '3', 10);
  }

  get crawlerTimeoutMs(): number {
    return parseInt(this.configService.get<string>('CRAWLER_TIMEOUT_MS') || '10000', 10);
  }

  get crawlerMaxRedirects(): number {
    return parseInt(this.configService.get<string>('CRAWLER_MAX_REDIRECTS') || '5', 10);
  }

  get crawlerMaxResponseSize(): number {
    return parseInt(this.configService.get<string>('CRAWLER_MAX_RESPONSE_SIZE') || '5242880', 10);
  }

  get crawlerGlobalConcurrency(): number {
    return parseInt(this.configService.get<string>('CRAWLER_GLOBAL_CONCURRENCY') || '5', 10);
  }

  get crawlerPerHostConcurrency(): number {
    return parseInt(this.configService.get<string>('CRAWLER_PER_HOST_CONCURRENCY') || '2', 10);
  }

  get crawlerRequestDelayMs(): number {
    return parseInt(this.configService.get<string>('CRAWLER_REQUEST_DELAY_MS') || '1000', 10);
  }

  get crawlerMaxSitemapSize(): number {
    return parseInt(this.configService.get<string>('CRAWLER_MAX_SITEMAP_SIZE') || '10485760', 10);
  }

  get crawlerMaxSitemapUrls(): number {
    return parseInt(this.configService.get<string>('CRAWLER_MAX_SITEMAP_URLS') || '1000', 10);
  }

  // ─── Helpers ─────────────────────────────────────────

  private getRequired(key: string): string {
    const value = this.configService.get<string>(key);
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  private validate(): void {
    // Validate ADMIN_API_KEY
    const adminKey = this.configService.get<string>('ADMIN_API_KEY');
    if (!adminKey || adminKey.length < 32) {
      throw new Error('ADMIN_API_KEY must be defined and at least 32 characters long for security');
    }
    // Validate test loopback constraint
    if (this.crawlerAllowTestLoopback && this.nodeEnv !== 'test') {
      throw new Error(
        'CRAWLER_ALLOW_TEST_LOOPBACK can only be true when NODE_ENV=test. In production or development, loopback connections are strictly prohibited.'
      );
    }
  }
}
