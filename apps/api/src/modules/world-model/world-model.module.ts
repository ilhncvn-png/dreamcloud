import { Module } from '@nestjs/common';
import { WorldModelController } from './world-model.controller';
import { WorldModelService } from './world-model.service';

@Module({
  controllers: [WorldModelController],
  providers:   [WorldModelService],
  exports:     [WorldModelService],
})
export class WorldModelModule {}
