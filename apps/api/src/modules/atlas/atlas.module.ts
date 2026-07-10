import { Module } from '@nestjs/common';
import { AtlasController } from './atlas.controller';
import { AtlasService } from './atlas.service';

@Module({
  controllers: [AtlasController],
  providers:   [AtlasService],
})
export class AtlasModule {}
