import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlacesExtractionService } from './places-extraction.service';
import { PlacesService, TrendPeriod } from './places.service';

@Controller('places')
@UseGuards(JwtAuthGuard)
export class PlacesController {
  constructor(
    private readonly places: PlacesService,
    private readonly extraction: PlacesExtractionService,
  ) {}

  @Get('trending')
  getTrending(@Query('period') period?: string) {
    const validPeriod = (['today', 'week', 'month'] as TrendPeriod[]).includes(period as TrendPeriod)
      ? (period as TrendPeriod)
      : undefined;

    if (validPeriod) {
      return this.places.getTrending(validPeriod);
    }
    return this.places.getTrendingAll();
  }

  @Get('curated')
  getCurated() {
    return this.places.getCurated();
  }

  @Post('reextract')
  reextract() {
    return this.extraction.reextractAll();
  }

  @Get(':name')
  getPlace(@Param('name') name: string) {
    return this.places.getPlaceIntelligence(decodeURIComponent(name));
  }
}
