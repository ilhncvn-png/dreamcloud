import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check()', () => {
    it('returns status ok with iso timestamp and version string', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(typeof result.version).toBe('string');
    });

    it('falls back to 0.1.0 when npm_package_version env var is not set', () => {
      const saved = process.env['npm_package_version'];
      delete process.env['npm_package_version'];

      const result = controller.check();
      expect(result.version).toBe('0.1.0');

      if (saved !== undefined) {
        process.env['npm_package_version'] = saved;
      }
    });

    it('uses npm_package_version when set', () => {
      process.env['npm_package_version'] = '1.2.3';

      const result = controller.check();
      expect(result.version).toBe('1.2.3');

      delete process.env['npm_package_version'];
    });
  });
});
