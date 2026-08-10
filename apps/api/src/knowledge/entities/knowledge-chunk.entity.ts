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
import { WebsitePage } from '../../crawler/entities/website-page.entity';
import { KnowledgeSourceType } from '@chatbot-platform/shared-types';

@Entity('knowledge_chunks')
@Index(['chatbotId', 'contentHash'], { unique: true })
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ name: 'chatbot_id' })
  chatbotId: string;

  @ManyToOne(() => WebsitePage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'source_page_id' })
  sourcePage: WebsitePage | null;

  @Column({ name: 'source_page_id', type: 'uuid', nullable: true })
  sourcePageId: string | null;

  @Column({
    name: 'source_type',
    type: 'varchar',
    length: 30,
    default: KnowledgeSourceType.CRAWL,
  })
  sourceType: KnowledgeSourceType;

  @Column({ name: 'source_url', type: 'varchar', length: 2048, nullable: true })
  sourceUrl: string | null;

  @Column({ name: 'page_title', type: 'varchar', length: 1024, nullable: true })
  pageTitle: string | null;

  @Column({ name: 'heading_path', type: 'varchar', length: 1024, nullable: true })
  headingPath: string | null;

  @Column({ type: 'text' })
  content: string;

  /**
   * PostgreSQL tsvector column for full-text search.
   * Populated via trigger or application logic.
   * GIN-indexed in the migration for fast search.
   */
  @Column({
    name: 'search_vector',
    type: 'tsvector',
    select: false,
    nullable: true,
  })
  searchVector: string | null;

  @Column({ name: 'content_hash', type: 'varchar', length: 64 })
  contentHash: string;

  @Column({ name: 'chunk_order', type: 'int', default: 0 })
  chunkOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
