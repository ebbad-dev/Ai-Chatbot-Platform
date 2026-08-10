import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';
import { CrawlJob } from './crawl-job.entity';

@Entity('website_pages')
@Index(['chatbotId', 'canonicalUrl'], { unique: true })
export class WebsitePage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ name: 'chatbot_id' })
  chatbotId: string;

  @ManyToOne(() => CrawlJob, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'last_crawl_job_id' })
  lastCrawlJob: CrawlJob | null;

  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @Column({ name: 'canonical_url', type: 'varchar', length: 2048 })
  canonicalUrl: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  title: string | null;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string | null;

  @Column({ name: 'markdown_content', type: 'text', nullable: true })
  markdownContent: string | null;

  @Column({ name: 'content_hash', type: 'varchar', length: 255, nullable: true })
  contentHash: string | null;

  @Column({ name: 'http_status', type: 'int', nullable: true })
  httpStatus: number | null;

  @Column({ name: 'content_type', type: 'varchar', length: 255, nullable: true })
  contentType: string | null;

  @Column({ name: 'last_crawled_at', type: 'timestamp', nullable: true })
  lastCrawledAt: Date | null;

  @Column({ name: 'index_status', type: 'varchar', length: 50, default: 'pending' })
  indexStatus: string;

  @Column({ name: 'processing_status', type: 'varchar', length: 50, default: 'pending' })
  processingStatus: string;

  @Column({ name: 'requires_rendering', type: 'boolean', default: false })
  requiresRendering: boolean;

  @Column({ name: 'first_seen_at', type: 'timestamp', nullable: true })
  firstSeenAt: Date | null;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
