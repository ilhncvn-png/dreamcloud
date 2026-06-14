import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200', async () => {
    // Import supertest dynamically to avoid CI dependency issues when DB is unavailable
    const { default: request } = await import('supertest');
    const response = await request(app.getHttpAdapter().getInstance()).get('/health');
    expect(response.status).toBe(200);
  });
});
