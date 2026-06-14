import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { DreamsModule } from './modules/dreams/dreams.module';
import { UsersModule } from './modules/users/users.module';
import { SocialModule } from './modules/social/social.module';
import { FeedModule } from './modules/feed/feed.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ModerationModule } from './modules/moderation/moderation.module';

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
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('database.url') ?? '',
        autoLoadEntities: true,
        synchronize: false,
        poolSize: config.get<number>('database.poolSize', 10),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        logging: config.get<string>('nodeEnv') === 'development',
      }),
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
    DreamsModule,
    UsersModule,
    SocialModule,
    FeedModule,
    SearchModule,
    NotificationsModule,
    ModerationModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
