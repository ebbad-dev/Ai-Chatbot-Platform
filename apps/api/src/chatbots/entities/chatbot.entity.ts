import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AllowedDomain } from './allowed-domain.entity';
import { ChatbotStatus, PlatformType } from '@chatbot-platform/shared-types';

@Entity('chatbots')
export class Chatbot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'public_key', type: 'varchar', length: 96, unique: true })
  publicKey: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'website_origin', type: 'varchar', length: 512 })
  websiteOrigin: string;

  @Column({ name: 'welcome_message', type: 'text' })
  welcomeMessage: string;

  @Column({ name: 'fallback_message', type: 'text' })
  fallbackMessage: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ChatbotStatus.DRAFT,
  })
  status: ChatbotStatus;

  // ─── Connector Configuration ─────────────────────────────

  /** E-commerce platform type for this chatbot's product data source */
  @Column({
    name: 'platform_type',
    type: 'varchar',
    length: 50,
    default: PlatformType.GENERIC,
  })
  platformType: PlatformType;

  /**
   * Platform-specific connection settings stored as JSONB.
   * Example for OpenCart: { "apiBaseUrl": "https://...", "apiKey": "..." }
   * Each connector reads only the fields it needs from this object.
   */
  @Column({ name: 'connector_config', type: 'jsonb', nullable: true })
  connectorConfig: Record<string, string | number | boolean | object | null> | null;

  // ─── Crawler Settings ────────────────────────────────────

  @Column({ name: 'crawl_page_limit', type: 'int', default: 500 })
  crawlPageLimit: number;

  @Column({ name: 'crawl_depth', type: 'int', default: 5 })
  crawlDepth: number;

  /**
   * URL path patterns the crawler should visit (allow-list).
   * When set, the crawler only visits pages matching these patterns.
   * Example: ["/about*", "/faq*", "/contact*", "/blog*", "/policy*"]
   */
  @Column({ name: 'crawl_allow_patterns', type: 'jsonb', nullable: true })
  crawlAllowPatterns: string[] | null;

  // ─── AI Configuration ────────────────────────────────────

  /** Optional custom system prompt for this chatbot's AI responses */
  @Column({ name: 'ai_system_prompt', type: 'text', nullable: true })
  aiSystemPrompt: string | null;

  // ─── Timestamps ──────────────────────────────────────────

  @Column({ name: 'last_indexed_at', type: 'timestamp', nullable: true })
  lastIndexedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AllowedDomain, (domain) => domain.chatbot, { cascade: true })
  allowedDomains: AllowedDomain[];
}

