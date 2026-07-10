import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('dream_identities')
export class DreamIdentity {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'primary_archetype', default: 'observer' })
  primaryArchetype: string;

  @Column({ name: 'secondary_archetype', default: 'seeker' })
  secondaryArchetype: string;

  @Column({ name: 'primary_archetype_score', default: 0 })
  primaryArchetypeScore: number;

  @Column({ name: 'secondary_archetype_score', default: 0 })
  secondaryArchetypeScore: number;

  @Column({ name: 'personality_summary', type: 'text', default: '' })
  personalitySummary: string;

  @Column({ name: 'dominant_themes', type: 'text', array: true, default: '{}' })
  dominantThemes: string[];

  @Column({ name: 'dominant_emotions', type: 'text', array: true, default: '{}' })
  dominantEmotions: string[];

  @Column({ name: 'dominant_symbols', type: 'text', array: true, default: '{}' })
  dominantSymbols: string[];

  @Column({ name: 'dominant_locations', type: 'text', array: true, default: '{}' })
  dominantLocations: string[];

  @Column({ name: 'dominant_archetypes', type: 'text', array: true, default: '{}' })
  dominantArchetypes: string[];

  @Column({ name: 'resonance_score', default: 0 })
  resonanceScore: number;

  @Column({ name: 'lucid_score', default: 0 })
  lucidScore: number;

  @Column({ name: 'transformation_score', default: 0 })
  transformationScore: number;

  @Column({ name: 'wonder_score', default: 0 })
  wonderScore: number;

  @Column({ name: 'connection_score', default: 0 })
  connectionScore: number;

  @Column({ name: 'dream_count', default: 0 })
  dreamCount: number;

  @Column({ name: 'computed_at', type: 'timestamptz', default: () => 'NOW()' })
  computedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
