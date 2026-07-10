import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClustersService } from './clusters.service';

@Controller('clusters')
@UseGuards(JwtAuthGuard)
export class ClustersController {
  constructor(private readonly svc: ClustersService) {}

  @Get()
  getAllClusters() {
    return this.svc.getAllClusters();
  }

  @Get('me')
  getMyClusters(@CurrentUser() user: { id: string }) {
    return this.svc.getMyClusters(user.id);
  }

  @Get(':id')
  getClusterById(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.svc.getClusterById(id, user.id);
  }

  @Post('recompute')
  recomputeAll() {
    return this.svc.recomputeAll();
  }
}
