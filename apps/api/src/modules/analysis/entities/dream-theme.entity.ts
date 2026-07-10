import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DreamAnalysis } from './dream-analysis.entity';

@Entity('dream_themes')
export class DreamTheme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DreamAnalysis, (a) => a.themes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  analysis: DreamAnalysis;

  @Column({ name: 'dream_id' })
  dreamId: string;

  @Column({ type: 'varchar', length: 60 })
  theme: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  themeFamily: string | null;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'float', default: 0.8 })
  confidence: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
