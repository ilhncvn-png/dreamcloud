import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserFollow } from './entities/user-follow.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserSettings } from './entities/user-settings.entity';
import { User } from './entities/user.entity';

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
}

export interface MyProfileResult {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: Date;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  isPublic: boolean;
  preferences: Record<string, unknown>;
  followerCount: number;
  followingCount: number;
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

function getPublicBaseUrl(): string {
  return process.env['PUBLIC_URL'] ?? `http://localhost:${process.env['PORT'] ?? 3000}`;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(UserFollow)
    private readonly followRepo: Repository<UserFollow>,
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

  private buildProfileResult(
    user: User,
    profile: UserProfile | null | undefined,
    followerCount: number,
    followingCount: number,
  ): MyProfileResult {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      displayName: profile?.displayName ?? null,
      bio: profile?.bio ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      locationCity: profile?.locationCity ?? null,
      locationCountry: profile?.locationCountry ?? null,
      isPublic: profile?.isPublic ?? true,
      preferences: (profile?.preferences as Record<string, unknown>) ?? {},
      followerCount,
      followingCount,
    };
  }

  async getMyProfile(userId: string): Promise<MyProfileResult> {
    const [user, followerCount, followingCount] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId }, relations: { profile: true } }),
      this.followRepo.count({ where: { followingId: userId } }),
      this.followRepo.count({ where: { followerId: userId } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    return this.buildProfileResult(user, user.profile, followerCount, followingCount);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<MyProfileResult> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    // Username uniqueness check
    if (dto.username && dto.username !== user.username) {
      const taken = await this.userRepo.findOne({ where: { username: dto.username } });
      if (taken) throw new ConflictException('Username already taken');
      await this.userRepo.update(userId, { username: dto.username });
      user.username = dto.username;
    }

    const profile = user.profile ?? (await this.profileRepo.findOne({ where: { userId } }));
    if (!profile) throw new NotFoundException('Profile not found');

    if (dto.displayName !== undefined) profile.displayName = dto.displayName;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.avatarUrl !== undefined) profile.avatarUrl = dto.avatarUrl;
    if (dto.locationCity !== undefined) profile.locationCity = dto.locationCity;
    if (dto.locationCountry !== undefined) profile.locationCountry = dto.locationCountry;
    if (dto.isPublic !== undefined) profile.isPublic = dto.isPublic;
    if (dto.preferences !== undefined) {
      profile.preferences = { ...(profile.preferences as Record<string, unknown>), ...dto.preferences };
    }
    await this.profileRepo.save(profile);

    const [followerCount, followingCount] = await Promise.all([
      this.followRepo.count({ where: { followingId: userId } }),
      this.followRepo.count({ where: { followerId: userId } }),
    ]);

    return this.buildProfileResult(user, profile, followerCount, followingCount);
  }

  async uploadAvatar(
    userId: string,
    dto: { base64: string; mimeType: string },
  ): Promise<{ avatarUrl: string }> {
    if (!ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException('Invalid file type. Allowed: JPEG, PNG, WebP.');
    }

    const buffer = Buffer.from(dto.base64, 'base64');
    if (buffer.length > MAX_AVATAR_SIZE) {
      throw new BadRequestException('File size exceeds 5 MB limit.');
    }

    const ext =
      dto.mimeType === 'image/jpeg' || dto.mimeType === 'image/jpg'
        ? 'jpg'
        : dto.mimeType === 'image/png'
          ? 'png'
          : 'webp';

    const filename = `${userId}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    await fs.mkdir(uploadDir, { recursive: true });

    // Remove previous avatar file for this user before writing the new one
    const existing = await this.profileRepo.findOne({ where: { userId } });
    if (existing?.avatarUrl) {
      try {
        const oldFile = path.basename(new URL(existing.avatarUrl).pathname);
        await fs.unlink(path.join(uploadDir, oldFile));
      } catch { /* old file missing or not a local upload — ignore */ }
    }

    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const avatarUrl = `${getPublicBaseUrl()}/api/v1/users/avatars/${filename}`;
    await this.profileRepo.update({ userId }, { avatarUrl });

    return { avatarUrl };
  }

  async serveAvatar(filename: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const filePath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(filename));
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch {
      throw new NotFoundException('Avatar not found');
    }
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mimeType =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return { buffer, mimeType };
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
