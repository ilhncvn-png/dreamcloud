import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Dream } from '../../dreams/entities/dream.entity';
import { User } from '../../users/entities/user.entity';

@Entity('dream_mentions')
export class DreamMention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dream_id' })
  dreamId: string;

  @Column({ name: 'dreamer_user_id' })
  dreamerUserId: string;

  @Column({ name: 'mentioned_user_id' })
  mentionedUserId: string;

  @Column({ name: 'matched_name', type: 'varchar', length: 255 })
  matchedName: string;

  @Column({ name: 'confidence_score', type: 'smallint', default: 80 })
  confidenceScore: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Dream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  dream: Dream;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dreamer_user_id' })
  dreamer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentioned_user_id' })
  mentionedUser: User;
}
