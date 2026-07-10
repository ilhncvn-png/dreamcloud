import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DreamClusterMember } from './dream-cluster-member.entity';

@Entity('dream_clusters')
export class DreamCluster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  primaryTheme: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  primarySymbol: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  primaryEmotion: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  primaryArchetype: string | null;

  @Column({ type: 'int', default: 0 })
  memberCount: number;

  @Column({ type: 'int', default: 0 })
  dreamCount: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  strengthScore: number;

  @OneToMany(() => DreamClusterMember, (m) => m.cluster)
  members: DreamClusterMember[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
