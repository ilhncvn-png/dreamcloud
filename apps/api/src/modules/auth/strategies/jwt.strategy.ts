import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // passport-jwt throws at construction if secretOrKey is falsy.
      // Use a placeholder so the app starts before JWT_PUBLIC_KEY is set in Railway.
      secretOrKey: configService.get<string>('jwt.publicKey') || 'jwt-public-key-not-yet-configured',
      algorithms: ['RS256'],
      issuer: configService.get<string>('jwt.issuer'),
      audience: configService.get<string>('jwt.audience'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
