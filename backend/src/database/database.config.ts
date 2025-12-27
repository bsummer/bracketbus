import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import * as path from 'path';

export const getDatabaseConfig = (): TypeOrmModuleOptions & DataSourceOptions => {
  // Determine if we're running from compiled code (dist folder)
  const isCompiled = __dirname.includes('dist');
  
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'bracketbus',
    entities: [__dirname + '/../common/entities/**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    migrations: [
      isCompiled
        ? path.join(__dirname, '../database/migrations/*.js')
        : path.join(__dirname, '../database/migrations/*.ts')
    ],
  };
};