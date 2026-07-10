import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForecastService } from './forecast.service';

@Controller('forecast')
@UseGuards(JwtAuthGuard)
export class ForecastController {
  constructor(private readonly forecast: ForecastService) {}

  @Get('today')
  getToday() { return this.forecast.getToday(); }

  @Get('week')
  getWeek() { return this.forecast.getWeek(); }

  @Get('month')
  getMonth() { return this.forecast.getMonth(); }

  @Get('city/:slug')
  async getCity(@Param('slug') slug: string) {
    const result = await this.forecast.getCityForecast(slug);
    if (!result) throw new NotFoundException(`City not found: ${slug}`);
    return result;
  }
}
