import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AtlasService } from './atlas.service';

@Controller('atlas')
@UseGuards(JwtAuthGuard)
export class AtlasController {
  constructor(private readonly atlas: AtlasService) {}

  @Get('world')
  getWorld() {
    return this.atlas.getWorld();
  }

  @Get('peaceful')
  getPeaceful() {
    return this.atlas.getPeaceful();
  }

  @Get('nightmares')
  getNightmares() {
    return this.atlas.getNightmares();
  }

  @Get('lucid')
  getLucid() {
    return this.atlas.getLucid();
  }

  @Get('symbols')
  getSymbols() {
    return this.atlas.getSymbols();
  }

  @Get('trending')
  getTrending() {
    return this.atlas.getTrending();
  }
}
