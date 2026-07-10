import { Module } from '@nestjs/common';
import { EventEngineController } from './event-engine.controller';
import { EventEngineService } from './event-engine.service';

@Module({
  controllers: [EventEngineController],
  providers:   [EventEngineService],
  exports:     [EventEngineService],
})
export class EventEngineModule {}
