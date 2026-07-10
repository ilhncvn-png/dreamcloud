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
import { DreamCluster } from './dream-cluster.entity';

@Entity('dream_cluster_members')
@Unique(['clusterId', 'userId'])
export class DreamClusterMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DreamCluster, (c) => c.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cluster_id' })
  cluster: DreamCluster;

  @Column({ name: 'cluster_id' })
  clusterId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  membershipScore: number;

  @Column({ type: 'text', array: true, default: '{}' })
  matchedThemes: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  matchedSymbols: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  matchedEmotions: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  matchedLocations: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  matchedArchetypes: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
