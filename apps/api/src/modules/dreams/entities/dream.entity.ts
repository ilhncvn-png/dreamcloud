import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DreamCategory, DreamVisibility } from '../../../common/enums/database.enums';
import { User } from '../../users/entities/user.entity';

@Entity('dreams')
export class Dream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: DreamCategory,
    enumName: 'dream_category',
    default: DreamCategory.NORMAL,
  })
  category: DreamCategory;

  @Column({
    type: 'enum',
    enum: DreamVisibility,
    enumName: 'dream_visibility',
    default: DreamVisibility.FOLLOWERS,
  })
  visibility: DreamVisibility;

  @Column({ type: 'boolean', default: false })
  isDraft: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  matchCount: number;

  @Column({ type: 'int', default: 0 })
  saveCount: number;

  @Column({ type: 'boolean', default: false })
  isModerated: boolean;

  @Column({ type: 'float', nullable: true })
  moderationScore: number | null;

  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  dreamedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;
}
