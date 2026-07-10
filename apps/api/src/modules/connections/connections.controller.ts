import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DreamConnectionsService } from './connections.service';
import type { ConnectionRow } from './connections.service';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

function formatConnection(row: ConnectionRow, userId: string) {
  return {
    id:                row.id,
    otherUserId:       row.other_user_id,
    otherUsername:     row.other_username,
    otherDisplayName:  row.other_display_name,
    otherAvatarUrl:    row.other_avatar_url,
    connectionScore:   row.connection_score,
    mutualDreams:      row.mutual_dreams,
    level:             row.level,
    firstSeenAt:       row.first_seen_at,
    lastSeenAt:        row.last_seen_at,
    iDreamedAboutThem: parseInt(row.i_dreamed_about_them, 10),
    theyDreamedAboutMe: parseInt(row.they_dreamed_about_me, 10),
  };
}

@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: DreamConnectionsService) {}

  @Get('me')
  async getMyConnections(@CurrentUser() user: JwtPayload) {
    const userId = user.sub;
    const rows = await this.connectionsService.getMyConnections(userId);
    return {
      items: rows.map(r => formatConnection(r, userId)),
      total: rows.length,
    };
  }

  @Get(':id')
  async getConnection(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const userId = user.sub;
    const detail = await this.connectionsService.getConnectionDetail(id, userId);
    if (!detail) throw new NotFoundException('Connection not found');
    return detail;
  }

  // Admin/dev endpoint to recompute all connections from existing mentions
  @Post('recompute')
  async recompute() {
    const count = await this.connectionsService.recomputeAll();
    return { connectionsFound: count };
  }
}
