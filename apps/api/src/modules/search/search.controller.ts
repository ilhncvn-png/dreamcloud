import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { SearchService } from './search.service';

class SearchQueryDto {
  @IsString()
  @MinLength(1)
  q!: string;

  @IsOptional()
  @IsEnum(['dreams', 'users', 'tags', 'all'])
  type?: 'dreams' | 'users' | 'tags' | 'all';
}

@ApiTags('search')
@Controller('search')
@UseGuards(OptionalJwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search dreams, users, and tags' })
  @ApiOkResponse()
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['dreams', 'users', 'tags', 'all'] })
  async search(@Query() query: SearchQueryDto) {
    const q = (query.q ?? '').trim();
    if (!q) return { dreams: [], users: [], tags: [] };

    switch (query.type) {
      case 'dreams':
        return { dreams: await this.searchService.searchDreams(q), users: [], tags: [] };
      case 'users':
        return { dreams: [], users: await this.searchService.searchUsers(q), tags: [] };
      case 'tags':
        return { dreams: [], users: [], tags: await this.searchService.searchTags(q) };
      default:
        return this.searchService.searchAll(q);
    }
  }
}
