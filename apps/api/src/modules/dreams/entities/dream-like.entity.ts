import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Dream } from './dream.entity';

@Entity('dream_likes')
@Index(['userId', 'dreamId'], { unique: true })
export class DreamLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'dream_id' })
  dreamId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Dream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  dream: Dream;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
