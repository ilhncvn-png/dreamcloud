import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: JwtPayload }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentication required');
    if (!ADMIN_ROLES.has(user.role)) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
