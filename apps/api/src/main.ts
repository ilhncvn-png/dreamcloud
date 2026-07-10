import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const isProd = process.env['NODE_ENV'] === 'production' || process.env['NODE_ENV'] === 'staging';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: !isProd }),
    {
      // Suppress [RouterExplorer], [InstanceLoader], [RoutesResolver] in Railway —
      // those flood Railway's log rate limit during startup.
      logger: isProd ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
    },
  );

  // Both /health and /api/v1/health are excluded from the global prefix so they
  // can be served at their literal paths without an extra api/v1 prepended.
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'api/v1/health'] });

  const defaultOrigins = ['http://localhost:4000', 'http://localhost:8081', 'http://localhost:19006'];
  const corsOrigins = process.env['CORS_ORIGINS']
    ? process.env['CORS_ORIGINS'].split(',').map((o) => o.trim()).filter(Boolean)
    : defaultOrigins;

  const defaultOrigins = ['http://localhost:4000', 'http://localhost:8081', 'http://localhost:19006'];
  const corsOrigins = process.env['CORS_ORIGINS']
    ? process.env['CORS_ORIGINS'].split(',').map((o) => o.trim()).filter(Boolean)
    : defaultOrigins;

  // Allow the admin panel and mobile dev server to call the API
  await app.register(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@fastify/cors') as Parameters<typeof app.register>[0],
    { origin: corsOrigins, credentials: true },
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('DreamCloud API')
      .setDescription('Dream-sharing platform REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  await app.listen(port, '0.0.0.0');

  console.log(`DreamCloud API listening on 0.0.0.0:${port}`);
  console.log(`NODE_ENV: ${process.env['NODE_ENV'] ?? 'development'}`);
  console.log(`Healthcheck available at /health`);
}

void bootstrap();
