import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Dream } from '../../dreams/entities/dream.entity';

export enum DreamPlaceType {
  CITY       = 'CITY',
  COUNTRY    = 'COUNTRY',
  LANDMARK   = 'LANDMARK',
  HOTEL      = 'HOTEL',
  RESTAURANT = 'RESTAURANT',
  CAFE       = 'CAFE',
  STREET     = 'STREET',
  BUILDING   = 'BUILDING',
  NATURE     = 'NATURE',
  UNKNOWN    = 'UNKNOWN',
}

@Entity('dream_places')
@Unique(['dreamId', 'name'])
export class DreamPlace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dream_id' })
  dream: Dream;

  @Column({ name: 'dream_id' })
  dreamId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: DreamPlaceType,
    enumName: 'dream_place_type',
    default: DreamPlaceType.UNKNOWN,
  })
  type: DreamPlaceType;

  @Column({ type: 'smallint', default: 80 })
  confidence: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 6, nullable: true })
  latitude: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 6, nullable: true })
  longitude: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
