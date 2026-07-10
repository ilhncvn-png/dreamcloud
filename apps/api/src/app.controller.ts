import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BypassTransform } from './common/decorators/bypass-transform.decorator';

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  version: string;
}

@ApiTags('health')
@Controller()
@BypassTransform()
export class AppController {
  private liveness(): HealthResponse {
    return {
      status: 'ok',
      service: 'dreamcloud-api',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.1.0',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe — root path (/health)' })
  check(): HealthResponse {
    return this.liveness();
  }

  @Get('api/v1/health')
  @ApiOperation({ summary: 'Liveness probe — versioned path (/api/v1/health)' })
  checkVersioned(): HealthResponse {
    return this.liveness();
  }
}
