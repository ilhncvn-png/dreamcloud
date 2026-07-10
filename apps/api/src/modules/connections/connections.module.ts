import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DreamConnection } from './entities/dream-connection.entity';
import { ConnectionsController } from './connections.controller';
import { DreamConnectionsService } from './connections.service';

@Module({
  imports: [TypeOrmModule.forFeature([DreamConnection])],
  controllers: [ConnectionsController],
  providers: [DreamConnectionsService],
  exports: [DreamConnectionsService],
})
export class ConnectionsModule {}
