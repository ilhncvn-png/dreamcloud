import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnalysisStatus } from '../../../common/enums/database.enums';
import { Dream } from '../../dreams/entities/dream.entity';
import { DreamEmotion } from './dream-emotion.entity';
import { DreamFigure } from './dream-figure.entity';
import { DreamLocation } from './dream-location.entity';
import { DreamObject } from './dream-object.entity';
import { DreamSymbol } from './dream-symbol.entity';
import { DreamTheme } from './dream-theme.entity';

@Entity('dream_analyses')
export class DreamAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Dream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  dream: Dream;

  @Column({ name: 'dream_id' })
  dreamId: string;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    enumName: 'analysis_status',
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modelVersion: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  analyzedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  rawResponse: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  primaryTheme: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  primaryEmotion: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  emotionalIntensity: string | null;

  @Column({ type: 'jsonb', nullable: true })
  emotionalArc: { from: string; to: string } | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  residualEmotion: string | null;

  @OneToMany(() => DreamTheme, (t) => t.analysis, { cascade: true })
  themes: DreamTheme[];

  @OneToMany(() => DreamEmotion, (e) => e.analysis, { cascade: true })
  emotions: DreamEmotion[];

  @OneToMany(() => DreamFigure, (f) => f.analysis, { cascade: true })
  figures: DreamFigure[];

  @OneToMany(() => DreamLocation, (l) => l.analysis, { cascade: true })
  locations: DreamLocation[];

  @OneToMany(() => DreamSymbol, (s) => s.analysis, { cascade: true })
  symbols: DreamSymbol[];

  @OneToMany(() => DreamObject, (o) => o.analysis, { cascade: true })
  objects: DreamObject[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
