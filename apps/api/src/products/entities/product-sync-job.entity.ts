import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';
import { ProductSyncJobStatus, ProductSyncType } from '@chatbot-platform/shared-types';

@Entity('product_sync_jobs')
export class ProductSyncJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ name: 'chatbot_id' })
  chatbotId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ProductSyncJobStatus.PENDING,
  })
  status: ProductSyncJobStatus;

  @Column({
    name: 'sync_type',
    type: 'varchar',
    length: 30,
    default: ProductSyncType.FULL,
  })
  syncType: ProductSyncType;

  @Column({ name: 'products_synced', type: 'int', default: 0 })
  productsSynced: number;

  @Column({ name: 'products_created', type: 'int', default: 0 })
  productsCreated: number;

  @Column({ name: 'products_updated', type: 'int', default: 0 })
  productsUpdated: number;

  @Column({ name: 'products_failed', type: 'int', default: 0 })
  productsFailed: number;

  @Column({ name: 'error_summary', type: 'text', nullable: true })
  errorSummary: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
