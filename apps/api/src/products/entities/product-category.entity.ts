import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';

@Entity('product_categories')
@Index(['chatbotId', 'externalId'], { unique: true })
export class ProductCategory {
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

  @Column({ type: 'varchar', length: 512, nullable: true })
  slug: string | null;

  @ManyToOne(() => ProductCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: ProductCategory | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
