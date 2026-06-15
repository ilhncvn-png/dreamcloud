import { createHash, randomBytes } from 'crypto';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      username: dto.username.toLowerCase(),
      passwordHash,
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(`Account locked until ${user.lockedUntil.toISOString()}`);
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash ?? '');
    if (!passwordValid) {
      await this.usersService.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateLastLogin(user.id);
    return this.issueTokens(user);
  }

  async refresh(rawToken: string): Promise<AuthTokensDto> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.refreshTokenRepo.delete(stored.id);
    return this.issueTokens(stored.user);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.refreshTokenRepo.update({ tokenHash }, { revokedAt: new Date() });
  }

  async getMe(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const accessTokenTtl = this.configService.get<number>('jwt.accessTokenTtl', 900);
    const refreshTokenTtl = this.configService.get<number>('jwt.refreshTokenTtl', 2592000);

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenTtl,
    });

    const rawRefreshToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date(Date.now() + refreshTokenTtl * 1000);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({ userId: user.id, tokenHash, expiresAt, revokedAt: null }),
    );

    return { accessToken, refreshToken: rawRefreshToken, expiresIn: accessTokenTtl };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
