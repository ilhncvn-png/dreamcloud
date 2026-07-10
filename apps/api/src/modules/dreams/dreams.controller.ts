import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AnalysisService } from '../analysis/analysis.service';
import { DreamAnalysisResponseDto } from '../analysis/dto/analysis-response.dto';
import { CreateDreamDto } from './dto/create-dream.dto';
import { DreamQueryDto } from './dto/dream-query.dto';
import { DreamResponseDto, PaginatedDreamsDto } from './dto/dream-response.dto';
import { UpdateDreamDto } from './dto/update-dream.dto';
import { DreamsService } from './dreams.service';

@ApiTags('dreams')
@Controller('dreams')
export class DreamsController {
  constructor(
    private readonly dreamsService: DreamsService,
    private readonly analysisService: AnalysisService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dream' })
  @ApiCreatedResponse({ type: DreamResponseDto })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDreamDto,
  ): Promise<DreamResponseDto> {
    const dream = await this.dreamsService.create(user.sub, dto);
    return DreamResponseDto.from(dream);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List public dreams (paginated, optional auth for like/save state)' })
  @ApiOkResponse({ type: PaginatedDreamsDto })
  async findPublic(
    @Query() query: DreamQueryDto,
    @CurrentUser() user?: JwtPayload | null,
  ): Promise<PaginatedDreamsDto> {
    const result = await this.dreamsService.findPublic(query, user?.sub ?? null);
    return {
      items: result.items.map((d) =>
        DreamResponseDto.from(d, { isLiked: d.isLiked, isSaved: d.isSaved }),
      ),
      meta: result.meta,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my dreams (all visibilities, paginated)' })
  @ApiOkResponse({ type: PaginatedDreamsDto })
  async findMyDreams(
    @CurrentUser() user: JwtPayload,
    @Query() query: DreamQueryDto,
  ): Promise<PaginatedDreamsDto> {
    const result = await this.dreamsService.findMyDreams(user.sub, query);
    return {
      items: result.items.map((d) =>
        DreamResponseDto.from(d, { isLiked: d.isLiked, isSaved: d.isSaved }),
      ),
      meta: result.meta,
    };
  }

  // Route registered at both /saved and /me/saved.
  // /me/saved returns 404 in NestJS+Fastify when the "me" node is
  // simultaneously a leaf endpoint and an intermediate node — a known
  // Fastify radix-tree edge case. /saved is the canonical path.
  @Get('saved')
  @Get('me/saved')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my saved dreams (paginated)' })
  @ApiOkResponse({ type: PaginatedDreamsDto })
  async findSavedDreams(
    @CurrentUser() user: JwtPayload,
    @Query() query: DreamQueryDto,
  ): Promise<PaginatedDreamsDto> {
    const result = await this.dreamsService.findSavedDreams(user.sub, query);
    return {
      items: result.items.map((d) =>
        DreamResponseDto.from(d, { isLiked: d.isLiked, isSaved: d.isSaved }),
      ),
      meta: result.meta,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a dream by ID' })
  @ApiOkResponse({ type: DreamResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DreamResponseDto> {
    const dream = await this.dreamsService.findOne(id, user.sub);
    return DreamResponseDto.from(dream, { isLiked: dream.isLiked, isSaved: dream.isSaved });
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on a dream' })
  @ApiOkResponse()
  async toggleLike(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ isLiked: boolean; likeCount: number }> {
    const result = await this.dreamsService.toggleLike(user.sub, id);
    return { isLiked: result.active, likeCount: result.count };
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle save on a dream' })
  @ApiOkResponse()
  async toggleSave(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ isSaved: boolean; saveCount: number }> {
    const result = await this.dreamsService.toggleSave(user.sub, id);
    return { isSaved: result.active, saveCount: result.count };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a dream (owner only)' })
  @ApiOkResponse({ type: DreamResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDreamDto,
  ): Promise<DreamResponseDto> {
    const dream = await this.dreamsService.update(id, user.sub, dto);
    return DreamResponseDto.from(dream);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a dream (owner only)' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.dreamsService.remove(id, user.sub);
  }

  @Get(':id/analysis')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Dream Intelligence analysis for a dream' })
  @ApiOkResponse({ type: DreamAnalysisResponseDto })
  @ApiNotFoundResponse({ description: 'Analysis not yet available or dream not found' })
  async getAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DreamAnalysisResponseDto> {
    // Verify the requester can access the dream
    await this.dreamsService.findOne(id, user.sub);

    const analysis = await this.analysisService.getAnalysis(id);
    if (!analysis) {
      throw new NotFoundException('Analysis not yet available for this dream');
    }
    return DreamAnalysisResponseDto.from(analysis);
  }

  @Post(':id/analysis/retry')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-trigger analysis for a dream (owner only)' })
  @ApiOkResponse()
  async retryAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ queued: boolean }> {
    await this.dreamsService.findOne(id, user.sub);
    await this.analysisService.enqueue(id);
    return { queued: true };
  }
}
