import { Module } from '@nestjs/common';
import { DreamMapController } from './dreammap.controller';
import { DreamMapService } from './dreammap.service';

@Module({
  controllers: [DreamMapController],
  providers:   [DreamMapService],
})
export class DreamMapModule {}
