import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  prefix: process.env['REDIS_PREFIX'] ?? 'dreamcloud:',
  queuePrefix: process.env['BULL_QUEUE_PREFIX'] ?? 'dreamcloud:queue',
}));
