import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DreamAnalysis } from './dream-analysis.entity';

@Entity('dream_emotions')
export class DreamEmotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DreamAnalysis, (a) => a.emotions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  analysis: DreamAnalysis;

  @Column({ name: 'dream_id' })
  dreamId: string;

  @Column({ type: 'varchar', length: 60 })
  emotion: string;

  @Column({ type: 'varchar', length: 20, default: 'moderate' })
  intensity: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'boolean', default: false })
  isResidual: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  arcPosition: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
