import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type DreamConnectionLevel = 'signal' | 'resonance' | 'strong' | 'deep' | 'mirror';

@Entity('dream_connections')
export class DreamConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id_a' })
  userIdA: string;

  @Column({ name: 'user_id_b' })
  userIdB: string;

  @Column({ name: 'connection_score', type: 'int', default: 0 })
  connectionScore: number;

  @Column({ name: 'mutual_dreams', type: 'int', default: 0 })
  mutualDreams: number;

  @Column({ type: 'varchar', length: 20, default: 'signal' })
  level: DreamConnectionLevel;

  @Column({ name: 'first_seen_at', type: 'timestamptz' })
  firstSeenAt: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id_a' })
  userA: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id_b' })
  userB: User;
}
