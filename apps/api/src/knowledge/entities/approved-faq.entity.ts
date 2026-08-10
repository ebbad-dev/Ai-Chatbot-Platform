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
import { FaqStatus } from '@chatbot-platform/shared-types';

@Entity('approved_faqs')
export class ApprovedFaq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ name: 'chatbot_id' })
  chatbotId: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ name: 'source_url', type: 'varchar', length: 2048, nullable: true })
  sourceUrl: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: FaqStatus.DRAFT,
  })
  status: FaqStatus;

  @Column({ name: 'approved_by', type: 'varchar', length: 255, nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
