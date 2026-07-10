import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DreamAnalysis } from './dream-analysis.entity';

@Entity('dream_locations')
export class DreamLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DreamAnalysis, (a) => a.locations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  analysis: DreamAnalysis;

  @Column({ name: 'dream_id' })
  dreamId: string;

  // 1 = named real-world, 2 = archetypal, 3 = impossible/constructed
  @Column({ type: 'int' })
  locationTier: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string | null;

  // 'dark_forest' | 'ocean' | 'childhood_home' | 'city' | 'corridor' | 'underground' | ...
  @Column({ type: 'varchar', length: 80, nullable: true })
  locationType: string | null;

  // 'unconscious' | 'origin' | 'threshold' | 'liminal' | 'exposure' | 'descent' | ...
  @Column({ type: 'varchar', length: 80, nullable: true })
  archetypeType: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  emotionalTone: string | null;

  @Column({ type: 'boolean', default: false })
  isDistorted: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  geographicHint: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
