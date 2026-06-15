import { registerAs } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

function loadKey(
  directEnvVar: string | undefined,
  pathEnvVar: string | undefined,
  defaultPath: string,
): string {
  if (directEnvVar) return directEnvVar;

  const keyPath = pathEnvVar ?? defaultPath;
  try {
    return fs.readFileSync(path.resolve(process.cwd(), keyPath), 'utf-8');
  } catch {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error(`JWT key not found at: ${keyPath}`);
    }
    return '';
  }
}

export default registerAs('jwt', () => ({
  privateKey: loadKey(
    process.env['JWT_PRIVATE_KEY'],
    process.env['JWT_PRIVATE_KEY_PATH'],
    './keys/jwt-private.key',
  ),
  publicKey: loadKey(
    process.env['JWT_PUBLIC_KEY'],
    process.env['JWT_PUBLIC_KEY_PATH'],
    './keys/jwt-public.key',
  ),
  accessTokenTtl: parseInt(process.env['JWT_ACCESS_TOKEN_TTL'] ?? '900', 10),
  refreshTokenTtl: parseInt(process.env['JWT_REFRESH_TOKEN_TTL'] ?? '2592000', 10),
  issuer: 'dreamcloud',
  audience: 'dreamcloud-app',
}));
