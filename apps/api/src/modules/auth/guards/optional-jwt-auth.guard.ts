import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<T>(_err: unknown, user: T): T {
    return user; // null when no token — no exception thrown
  }
}
