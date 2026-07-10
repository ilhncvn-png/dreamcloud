import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DreamCluster } from './entities/dream-cluster.entity';
import { DreamClusterMember } from './entities/dream-cluster-member.entity';
import { ClustersService } from './clusters.service';
import { ClustersController } from './clusters.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DreamCluster, DreamClusterMember])],
  controllers: [ClustersController],
  providers: [ClustersService],
  exports: [ClustersService],
})
export class ClustersModule {}
