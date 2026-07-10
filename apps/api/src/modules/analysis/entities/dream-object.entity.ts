import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DreamAnalysis } from './dream-analysis.entity';

@Entity('dream_objects')
export class DreamObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DreamAnalysis, (a) => a.objects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  analysis: DreamAnalysis;

  @Column({ name: 'dream_id' })
  dreamId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  objectName: string | null;

  // 'transition' | 'transformation' | 'personal' | 'impossible'
  @Column({ type: 'varchar', length: 80, nullable: true })
  objectType: string | null;

  // 'door' | 'key' | 'mirror' | 'vehicle' | 'weapon' | 'clock' | 'phone' | 'bridge' | ...
  @Column({ type: 'varchar', length: 80, nullable: true })
  symbolicCategory: string | null;

  // 'opens_path' | 'blocks' | 'reveals' | 'threatens' | 'guides'
  @Column({ type: 'varchar', length: 80, nullable: true })
  narrativeFunction: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  emotionalContext: string | null;

  @Column({ type: 'boolean', default: false })
  isImpossible: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
