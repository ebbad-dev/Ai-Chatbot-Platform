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
import { ProductCategory } from './product-category.entity';
import { StockStatus } from '@chatbot-platform/shared-types';

@Entity('products')
@Index(['chatbotId', 'externalId'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ name: 'chatbot_id' })
  chatbotId: string;

  @Column({ name: 'external_id', type: 'varchar', length: 255 })
  externalId: string;

  @Column({ type: 'varchar', length: 512 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => ProductCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory | null;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  /** Human-readable category name stored for fast search without joins */
  @Column({ name: 'category_name', type: 'varchar', length: 512, nullable: true })
  categoryName: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: number;

  /** Original/list price before discount */
  @Column({ name: 'compare_at_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  compareAtPrice: number | null;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercent: number | null;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  brand: string | null;

  @Column({ name: 'stock_quantity', type: 'int', nullable: true })
  stockQuantity: number | null;

  @Column({
    name: 'stock_status',
    type: 'varchar',
    length: 30,
    default: StockStatus.IN_STOCK,
  })
  stockStatus: StockStatus;

  @Column({ name: 'shipping_info', type: 'text', nullable: true })
  shippingInfo: string | null;

  /** Array of image URLs stored as JSONB */
  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ name: 'product_url', type: 'varchar', length: 2048, nullable: true })
  productUrl: string | null;

  /** Platform-specific extra fields that don't map to standard columns */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, string | number | boolean | object | null> | null;

  /** SHA-256 hash of source data for change detection during sync */
  @Column({ name: 'sync_hash', type: 'varchar', length: 64, nullable: true })
  syncHash: string | null;

  @Column({ name: 'last_synced_at', type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Semantic vector embedding of product title and description for nearest neighbor search */
  @Column({ type: 'float', array: true, nullable: true })
  embedding: number[] | null;
}
