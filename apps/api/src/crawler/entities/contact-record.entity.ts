import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Index } from 'typeorm';
import { Chatbot } from '../../chatbots/entities/chatbot.entity';

@Entity('contact_records')
@Index(['chatbotId', 'type', 'normalizedValue'], { unique: true })
export class ContactRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ name: 'chatbot_id' })
  chatbotId: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 1024 })
  value: string;

  @Column({ name: 'normalized_value', type: 'varchar', length: 1024 })
  normalizedValue: string;

  @Column({ name: 'source_url', type: 'varchar', length: 2048, nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
