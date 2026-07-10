import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'dream_match', default: true })
  dreamMatch: boolean;

  @Column({ name: 'dream_connection', default: true })
  dreamConnection: boolean;

  @Column({ name: 'shared_symbol', default: true })
  sharedSymbol: boolean;

  @Column({ name: 'high_resonance', default: true })
  highResonance: boolean;

  @Column({ name: 'signal_trending', default: true })
  signalTrending: boolean;

  @Column({ name: 'dream_milestone', default: true })
  dreamMilestone: boolean;

  @Column({ name: 'dream_mention', default: true })
  dreamMention: boolean;

  @Column({ default: true })
  social: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
