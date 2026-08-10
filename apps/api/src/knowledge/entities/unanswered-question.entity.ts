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
import { ApprovedFaq } from './approved-faq.entity';
import { UnansweredQuestionStatus, ResolutionType } from '@chatbot-platform/shared-types';

@Entity('unanswered_questions')
export class UnansweredQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ name: 'chatbot_id' })
  chatbotId: string;

  @Column({ name: 'normalized_question', type: 'text' })
  normalizedQuestion: string;

  @Column({ name: 'example_question', type: 'text' })
  exampleQuestion: string;

  @Column({ name: 'occurrence_count', type: 'int', default: 1 })
  occurrenceCount: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: UnansweredQuestionStatus.NEW,
  })
  status: UnansweredQuestionStatus;

  @Column({
    name: 'resolution_type',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  resolutionType: ResolutionType | null;

  @Column({ name: 'resolved_source_url', type: 'varchar', length: 2048, nullable: true })
  resolvedSourceUrl: string | null;

  @ManyToOne(() => ApprovedFaq, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_faq_id' })
  resolvedFaq: ApprovedFaq | null;

  @Column({ name: 'resolved_faq_id', type: 'uuid', nullable: true })
  resolvedFaqId: string | null;

  @Column({ name: 'first_seen_at', type: 'timestamp' })
  firstSeenAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamp' })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
