import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  locationCity: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  locationCountry: string | null;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'int', default: 0 })
  dreamCount: number;

  @Column({ type: 'int', default: 0 })
  followerCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
