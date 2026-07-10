import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { BusinessService } from './business.service';

@ApiTags('admin/business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/business')
export class BusinessController {
  constructor(private readonly business: BusinessService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue dashboard — platform metrics + revenue placeholders' })
  getRevenueDashboard() {
    return this.business.getRevenueDashboard();
  }

  @Get('segments')
  @ApiOperation({ summary: 'User segments — real behavioral segments from DB' })
  getUserSegments() {
    return this.business.getUserSegments();
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Campaign overview — zones and platform context' })
  getCampaigns() {
    return this.business.getCampaigns();
  }

  @Get('ads')
  @ApiOperation({ summary: 'Advertising overview — placements, safety, audience' })
  getAdvertisingOverview() {
    return this.business.getAdvertisingOverview();
  }
}
