import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  ConnectionSummaryDto,
  DreamMatchDto,
  MatchDetailDto,
  PaginatedMatchesDto,
} from './dto/match-response.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { MatchingService } from './matching.service';

@ApiTags('matches')
@Controller('matches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchesController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('my-matches')
  @ApiOperation({ summary: 'Top dream matches for the current user' })
  @ApiOkResponse({ type: PaginatedMatchesDto })
  async getMyMatches(
    @CurrentUser() user: JwtPayload,
    @Query() query: MatchQueryDto,
  ): Promise<PaginatedMatchesDto> {
    const { matches, total } = await this.matchingService.getMyMatches(
      user.sub,
      query.limit ?? 20,
      query.offset ?? 0,
    );
    return {
      items: matches.map((m) => DreamMatchDto.from(m, user.sub)),
      meta:  { total, limit: query.limit ?? 20, offset: query.offset ?? 0 },
    };
  }

  @Get('my-connections')
  @ApiOperation({ summary: 'Dream connections grouped by user' })
  @ApiOkResponse({ type: [ConnectionSummaryDto] })
  async getMyConnections(
    @CurrentUser() user: JwtPayload,
  ): Promise<ConnectionSummaryDto[]> {
    const connections = await this.matchingService.getMyConnections(user.sub);
    return connections.map(ConnectionSummaryDto.from);
  }

  @Get('dream/:id')
  @ApiOperation({ summary: 'Matches for a specific dream' })
  @ApiOkResponse({ type: PaginatedMatchesDto })
  async getMatchesForDream(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: MatchQueryDto,
  ): Promise<PaginatedMatchesDto> {
    const { matches, total } = await this.matchingService.getMatchesForDream(
      id,
      query.limit ?? 20,
      query.offset ?? 0,
    );
    return {
      items: matches.map((m) => DreamMatchDto.from(m, user.sub)),
      meta:  { total, limit: query.limit ?? 20, offset: query.offset ?? 0 },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full match detail with resonance explanation data' })
  @ApiOkResponse({ type: MatchDetailDto })
  @ApiNotFoundResponse({ description: 'Match not found' })
  async getMatchById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<MatchDetailDto> {
    const result = await this.matchingService.getMatchById(id);
    if (!result) throw new NotFoundException('Match not found');
    return MatchDetailDto.from(result.match, user.sub, result.sharedArchetypes);
  }
}
