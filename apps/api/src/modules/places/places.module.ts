import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DreamPlace } from './entities/dream-place.entity';
import { PlacesExtractionService } from './places-extraction.service';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DreamPlace])],
  controllers: [PlacesController],
  providers: [PlacesService, PlacesExtractionService],
  exports: [PlacesExtractionService],
})
export class PlacesModule {}
