import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DreamVisibility } from '../../../common/enums/database.enums';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'boolean', default: true })
  notifyDreamMatch: boolean;

  @Column({ type: 'boolean', default: true })
  notifyLikes: boolean;

  @Column({ type: 'boolean', default: true })
  notifyComments: boolean;

  @Column({ type: 'boolean', default: true })
  notifyFollows: boolean;

  @Column({ type: 'boolean', default: true })
  morningReminderEnabled: boolean;

  @Column({ type: 'time', default: '08:00:00' })
  morningReminderTime: string;

  @Column({ type: 'varchar', length: 50, default: 'Europe/Istanbul' })
  morningReminderTimezone: string;

  @Column({
    type: 'enum',
    enum: DreamVisibility,
    enumName: 'dream_visibility',
    default: DreamVisibility.FOLLOWERS,
  })
  defaultDreamVisibility: DreamVisibility;

  @Column({ type: 'boolean', default: false })
  allowDreamInAds: boolean;

  @Column({ type: 'boolean', default: false })
  allowDataResearch: boolean;

  @Column({ type: 'varchar', length: 10, default: 'tr' })
  language: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
