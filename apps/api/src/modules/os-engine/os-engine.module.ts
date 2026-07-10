import { Module } from '@nestjs/common';
import { OsEngineController } from './os-engine.controller';
import { OsEngineService } from './os-engine.service';

@Module({
  controllers: [OsEngineController],
  providers:   [OsEngineService],
  exports:     [OsEngineService],
})
export class OsEngineModule {}
