import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import configuration from './config/configuration';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { DreamsModule } from './modules/dreams/dreams.module';
import { FollowsModule } from './modules/follows/follows.module';
import { UsersModule } from './modules/users/users.module';
import { SocialModule } from './modules/social/social.module';
import { FeedModule } from './modules/feed/feed.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { ConnectionsModule } from './modules/connections/connections.module';
import { MatchesModule } from './modules/matches/matches.module';
import { MentionsModule } from './modules/mentions/mentions.module';
import { SignalsModule } from './modules/signals/signals.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ClustersModule } from './modules/clusters/clusters.module';
import { PlacesModule } from './modules/places/places.module';
import { AtlasModule } from './modules/atlas/atlas.module';
import { DreamMapModule } from './modules/dreammap/dreammap.module';
import { ForecastModule } from './modules/forecast/forecast.module';
import { WeatherModule } from './modules/weather/weather.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { EventEngineModule } from './modules/event-engine/event-engine.module';
import { OsEngineModule } from './modules/os-engine/os-engine.module';
import { WorldModelModule } from './modules/world-model/world-model.module';
import { BusinessModule } from './modules/business/business.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, jwtConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('nodeEnv') ?? 'development';
        return {
          type: 'postgres' as const,
          url: config.get<string>('database.url') ?? '',
          autoLoadEntities: true,
          synchronize: false,
          namingStrategy: new SnakeNamingStrategy(),
          poolSize: config.get<number>('database.poolSize', 10),
          ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
          logging: nodeEnv === 'development',
          migrations: [path.join(__dirname, 'database', 'migrations', '*{.ts,.js}')],
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttlMs', 60000),
            limit: config.get<number>('throttle.limit', 100),
          },
        ],
      }),
    }),

    AuthModule,
    CommentsModule,
    DreamsModule,
    FollowsModule,
    UsersModule,
    SocialModule,
    FeedModule,
    SearchModule,
    NotificationsModule,
    ModerationModule,
    AnalysisModule,
    ConnectionsModule,
    MatchesModule,
    MentionsModule,
    SignalsModule,
    IdentityModule,
    ClustersModule,
    PlacesModule,
    AtlasModule,
    DreamMapModule,
    ForecastModule,
    WeatherModule,
    AdminModule,
    AppConfigModule,
    IntelligenceModule,
    EventEngineModule,
    OsEngineModule,
    WorldModelModule,
    BusinessModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
