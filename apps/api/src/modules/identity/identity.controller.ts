import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { IdentityService } from './identity.service';

@ApiTags('identity')
@Controller('identity')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my dream identity (computes if stale)' })
  @ApiOkResponse()
  getMyIdentity(@CurrentUser() user: JwtPayload) {
    return this.identityService.getOrCompute(user.sub);
  }

  @Post('compute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force-recompute dream identity' })
  @ApiOkResponse()
  recompute(@CurrentUser() user: JwtPayload) {
    return this.identityService.compute(user.sub);
  }
}
