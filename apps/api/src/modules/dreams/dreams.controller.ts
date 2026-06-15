import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateDreamDto } from './dto/create-dream.dto';
import { DreamQueryDto } from './dto/dream-query.dto';
import { DreamResponseDto, PaginatedDreamsDto } from './dto/dream-response.dto';
import { UpdateDreamDto } from './dto/update-dream.dto';
import { DreamsService } from './dreams.service';

@ApiTags('dreams')
@Controller('dreams')
export class DreamsController {
  constructor(private readonly dreamsService: DreamsService) {}

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
  @ApiOperation({ summary: 'List public dreams (paginated, no auth required)' })
  @ApiOkResponse({ type: PaginatedDreamsDto })
  async findPublic(@Query() query: DreamQueryDto): Promise<PaginatedDreamsDto> {
    const result = await this.dreamsService.findPublic(query);
    return {
      items: result.items.map((d) => DreamResponseDto.from(d)),
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
      items: result.items.map((d) => DreamResponseDto.from(d)),
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
    return DreamResponseDto.from(dream);
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
}
