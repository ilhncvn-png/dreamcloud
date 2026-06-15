import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DreamsController } from './dreams.controller';
import { DreamsService } from './dreams.service';
import { Dream } from './entities/dream.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dream])],
  controllers: [DreamsController],
  providers: [DreamsService],
  exports: [DreamsService],
})
export class DreamsModule {}
