import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BypassTransform } from './common/decorators/bypass-transform.decorator';

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  version: string;
}

@ApiTags('health')
@Controller()
@BypassTransform()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe — always returns 200 when the process is alive' })
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.1.0',
    };
  }
}
