import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { UserSettings } from './entities/user-settings.entity';
import { User } from './entities/user.entity';

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const [existingEmail, existingUsername] = await Promise.all([
      this.findByEmail(input.email),
      this.findByUsername(input.username),
    ]);

    if (existingEmail) throw new ConflictException('Email already in use');
    if (existingUsername) throw new ConflictException('Username already taken');

    const user = this.userRepo.create({
      email: input.email,
      username: input.username,
      passwordHash: input.passwordHash,
      profile: new UserProfile(),
      settings: new UserSettings(),
    });

    return this.userRepo.save(user);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepo.update(userId, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  async recordFailedLogin(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_DURATION_MS) : user.lockedUntil;

    await this.userRepo.update(userId, {
      failedLoginAttempts: attempts,
      lockedUntil,
    });
  }
}
