import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';
import { WebsitePage } from './website-page.entity';

export enum CrawlJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  COMPLETED_WITH_ERRORS = 'completed_with_errors',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('crawl_jobs')
export class CrawlJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ name: 'chatbot_id' })
  chatbotId: string;

  @Column({ type: 'varchar', length: 50, default: CrawlJobStatus.PENDING })
  status: CrawlJobStatus;

  @Column({ name: 'pages_discovered', type: 'int', default: 0 })
  pagesDiscovered: number;

  @Column({ name: 'pages_processed', type: 'int', default: 0 })
  pagesProcessed: number;

  @Column({ name: 'pages_failed', type: 'int', default: 0 })
  pagesFailed: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'error_summary', type: 'text', nullable: true })
  errorSummary: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => WebsitePage, (page) => page.lastCrawlJob)
  pages: WebsitePage[];
}
