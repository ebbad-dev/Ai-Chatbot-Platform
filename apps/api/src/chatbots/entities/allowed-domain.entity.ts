import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Chatbot } from './chatbot.entity';

@Entity('allowed_domains')
@Index(['chatbot', 'domain'], { unique: true })
export class AllowedDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chatbot, (chatbot) => chatbot.allowedDomains, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: Chatbot;

  @Column({ type: 'varchar', length: 512 })
  domain: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
