import * as fs from 'fs';
import * as path from 'path';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  database: {
    url: string;
    poolSize: number;
    ssl: boolean;
  };
  redis: {
    url: string;
    prefix: string;
  };
  jwt: {
    privateKey: string;
    publicKey: string;
    accessTokenTtl: number;
    refreshTokenTtl: number;
  };
  aws: {
    region: string;
    s3Bucket: string;
    sesFromEmail: string;
  };
  nlp: {
    serviceUrl: string;
    timeoutMs: number;
  };
  throttle: {
    ttlMs: number;
    limit: number;
    authTtlMs: number;
    authLimit: number;
  };
}

function readKeyFile(envPath: string | undefined, fallback: string): string {
  const keyPath = envPath ?? fallback;
  try {
    return fs.readFileSync(path.resolve(process.cwd(), keyPath), 'utf-8');
  } catch {
    return '';
  }
}

export default (): AppConfig => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  apiPrefix: process.env['API_PREFIX'] ?? 'api/v1',
  corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),

  database: {
    url: process.env['DATABASE_URL'] ?? '',
    poolSize: parseInt(process.env['DATABASE_POOL_SIZE'] ?? '10', 10),
    ssl: process.env['NODE_ENV'] === 'production',
  },

  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    prefix: process.env['REDIS_PREFIX'] ?? 'dreamcloud:',
  },

  jwt: {
    privateKey: readKeyFile(process.env['JWT_PRIVATE_KEY_PATH'], './keys/jwt-private.key'),
    publicKey: readKeyFile(process.env['JWT_PUBLIC_KEY_PATH'], './keys/jwt-public.key'),
    accessTokenTtl: parseInt(process.env['JWT_ACCESS_TOKEN_TTL'] ?? '900', 10),
    refreshTokenTtl: parseInt(process.env['JWT_REFRESH_TOKEN_TTL'] ?? '2592000', 10),
  },

  aws: {
    region: process.env['AWS_REGION'] ?? 'eu-central-1',
    s3Bucket: process.env['AWS_S3_BUCKET_MEDIA'] ?? '',
    sesFromEmail: process.env['AWS_SES_FROM_EMAIL'] ?? 'noreply@dreamcloud.app',
  },

  nlp: {
    serviceUrl: process.env['NLP_SERVICE_URL'] ?? 'http://localhost:8000',
    timeoutMs: parseInt(process.env['NLP_SERVICE_TIMEOUT_MS'] ?? '5000', 10),
  },

  throttle: {
    ttlMs: parseInt(process.env['THROTTLE_TTL_MS'] ?? '60000', 10),
    limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
    authTtlMs: parseInt(process.env['AUTH_THROTTLE_TTL_MS'] ?? '900000', 10),
    authLimit: parseInt(process.env['AUTH_THROTTLE_LIMIT'] ?? '10', 10),
  },
});
