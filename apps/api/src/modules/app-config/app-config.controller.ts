import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from './app-config.service';

@ApiTags('app')
@Controller('app')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Public mobile config — no auth required' })
  getConfig() {
    return this.appConfigService.getPublicConfig();
  }
}
