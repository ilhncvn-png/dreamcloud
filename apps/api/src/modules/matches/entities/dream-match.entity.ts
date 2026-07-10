import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Dream } from '../../dreams/entities/dream.entity';
import { User } from '../../users/entities/user.entity';

export enum ResonanceLevel {
  SIGNAL    = 'signal',
  RESONANCE = 'resonance',
  STRONG    = 'strong',
  DEEP      = 'deep',
  MIRROR    = 'mirror',
}

@Entity('dream_matches')
@Unique('uq_dream_matches_pair', ['dreamIdA', 'dreamIdB'])
export class DreamMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dream, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'dream_id_a' })
  dreamA: Dream;

  @Column({ name: 'dream_id_a' })
  dreamIdA: string;

  @ManyToOne(() => Dream, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'dream_id_b' })
  dreamB: Dream;

  @Column({ name: 'dream_id_b' })
  dreamIdB: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id_a' })
  userA: User;

  @Column({ name: 'user_id_a' })
  userIdA: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id_b' })
  userB: User;

  @Column({ name: 'user_id_b' })
  userIdB: string;

  @Column({ type: 'float' })
  matchScore: number;

  @Column({ type: 'varchar', length: 20 })
  resonanceLevel: ResonanceLevel;

  @Column({ type: 'float', default: 0 })
  themeScore: number;

  @Column({ type: 'float', default: 0 })
  emotionScore: number;

  @Column({ type: 'float', default: 0 })
  symbolScore: number;

  @Column({ type: 'float', default: 0 })
  locationScore: number;

  @Column({ type: 'text', array: true, default: '{}' })
  sharedThemes: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  sharedEmotions: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  sharedSymbols: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  sharedLocations: string[];

  @Column({ type: 'float', default: 0 })
  archetypeScore: number;

  @Column({ type: 'text', array: true, default: '{}' })
  sharedArchetypes: string[];

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  calculatedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
