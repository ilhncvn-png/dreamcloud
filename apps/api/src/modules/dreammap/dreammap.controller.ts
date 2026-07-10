import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DreamMapService } from './dreammap.service';

@Controller('dream-map')
@UseGuards(JwtAuthGuard)
export class DreamMapController {
  constructor(private readonly svc: DreamMapService) {}

  @Get('world')
  getWorld() {
    return this.svc.getWorld();
  }

  @Get('cities')
  getCities() {
    return this.svc.getCities();
  }

  @Get('hotspots')
  getHotspots() {
    return this.svc.getHotspots();
  }

  @Get('constellations')
  getConstellations() {
    return this.svc.getConstellations();
  }

  @Get('city/:slug')
  async getCity(@Param('slug') slug: string) {
    const city = await this.svc.getCity(slug);
    if (!city) throw new NotFoundException(`City not found: ${slug}`);
    return city;
  }
}
