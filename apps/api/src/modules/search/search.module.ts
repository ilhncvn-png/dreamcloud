import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/entities/user.entity';
import { Dream } from '../dreams/entities/dream.entity';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dream, User, UserProfile])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
