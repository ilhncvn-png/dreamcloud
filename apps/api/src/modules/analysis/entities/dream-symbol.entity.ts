import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DreamAnalysis } from './dream-analysis.entity';

@Entity('dream_symbols')
export class DreamSymbol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DreamAnalysis, (a) => a.symbols, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  analysis: DreamAnalysis;

  @Column({ name: 'dream_id' })
  dreamId: string;

  // 'threshold' | 'shadow' | 'flood' | 'abyss' | 'guide' | 'transformation' | 'labyrinth' | ...
  @Column({ type: 'varchar', length: 80 })
  symbolCategory: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  manifestation: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  emotionalContext: string | null;

  // 'approach' | 'flee' | 'passive' | 'transform' | 'receive'
  @Column({ type: 'varchar', length: 80, nullable: true })
  narrativeFunction: string | null;

  @Column({ type: 'boolean', default: false })
  isUniversal: boolean;

  @Column({ type: 'float', default: 0.7 })
  confidence: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
