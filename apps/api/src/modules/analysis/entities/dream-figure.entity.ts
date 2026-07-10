import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DreamAnalysis } from './dream-analysis.entity';

@Entity('dream_figures')
export class DreamFigure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DreamAnalysis, (a) => a.figures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  analysis: DreamAnalysis;

  @Column({ name: 'dream_id' })
  dreamId: string;

  // 'unknown' | 'known_personal' | 'known_public' | 'self_variant'
  @Column({ type: 'varchar', length: 60 })
  figureType: string;

  @Column({ type: 'boolean', default: false })
  isKnown: boolean;

  // 'family' | 'friend' | 'romantic' | 'authority' | 'stranger'
  @Column({ type: 'varchar', length: 60, nullable: true })
  relationshipType: string | null;

  // 'shadow' | 'anima' | 'animus' | 'wise_elder' | 'trickster' | 'guide' | 'hero' | 'child'
  @Column({ type: 'varchar', length: 80, nullable: true })
  archetypeCandidate: string | null;

  @Column({ type: 'float', nullable: true })
  archetypeConfidence: number | null;

  @Column({ type: 'text', array: true, default: '{}' })
  qualityDescriptors: string[];

  // 'guide' | 'pursuer' | 'observer' | 'companion' | 'antagonist' | 'absent'
  @Column({ type: 'varchar', length: 60, nullable: true })
  narrativeRole: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
