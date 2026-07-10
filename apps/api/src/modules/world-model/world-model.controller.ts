import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { WorldModelService } from './world-model.service';

@ApiTags('admin/world')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/world')
export class WorldModelController {
  constructor(private readonly world: WorldModelService) {}

  @Get('weather')
  @ApiOperation({ summary: 'Dream Weather Engine — emotional climate, pressure, mood forecast' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getDreamWeatherEngine(@Query('days') days?: string) {
    return this.world.getDreamWeatherEngine(days ? parseInt(days) : 7);
  }

  @Get('symbols')
  @ApiOperation({ summary: 'Symbol Economy — rising, falling, emerging, consistent symbols' })
  getSymbolEconomy() {
    return this.world.getSymbolEconomy();
  }

  @Get('archetypes')
  @ApiOperation({ summary: 'Archetype Dynamics — dominant, weekly trend, activation changes' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  getArchetypeDynamics(@Query('weeks') weeks?: string) {
    return this.world.getArchetypeDynamics(weeks ? parseInt(weeks) : 8);
  }

  @Get('consciousness')
  @ApiOperation({ summary: 'Consciousness Index — awareness, coherence, stability scores' })
  getConsciousnessIndex() {
    return this.world.getConsciousnessIndex();
  }

  @Get('seasons')
  @ApiOperation({ summary: 'Dream Seasons — monthly eras, transition phases, quarterly profile' })
  getDreamSeasons() {
    return this.world.getDreamSeasons();
  }
}
