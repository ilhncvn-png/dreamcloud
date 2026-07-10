import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { type DreamWeatherDto, type TraceDetailDto } from './dto/weather.dto';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@Controller('weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('now')
  @ApiOperation({ summary: 'Dream Weather snapshot for the last 24 hours' })
  @ApiOkResponse()
  getNow(): Promise<DreamWeatherDto> {
    return this.weatherService.getWeatherNow();
  }

  // Phase 7: Signal detail endpoint for the trace detail screen
  @Get('trace/:type/:name')
  @ApiOperation({ summary: 'Detail for a specific dream trace by type and name' })
  @ApiOkResponse()
  getTrace(
    @Param('type') type: string,
    @Param('name') name: string,
  ): Promise<TraceDetailDto> {
    return this.weatherService.getTraceDetail(type, name);
  }
}
