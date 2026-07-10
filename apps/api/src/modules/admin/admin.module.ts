import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminLog } from './entities/admin-log.entity';
import { DreamReport } from './entities/dream-report.entity';
import { DreamAnalysisModule } from '../dream-analysis/dream-analysis.module';

@Module({
  imports: [TypeOrmModule.forFeature([AdminLog, DreamReport]), DreamAnalysisModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
