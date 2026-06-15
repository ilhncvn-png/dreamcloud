import { DataSource, type DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

config({ path: path.resolve(__dirname, '../../.env') });

const isTest = process.env['NODE_ENV'] === 'test';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env['DATABASE_URL'] ?? '',
  entities: [path.join(__dirname, '../modules/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../database/migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env['NODE_ENV'] === 'development',
  ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
  namingStrategy: new SnakeNamingStrategy(),
  extra: {
    max: isTest ? 2 : parseInt(process.env['DATABASE_POOL_SIZE'] ?? '10', 10),
  },
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
