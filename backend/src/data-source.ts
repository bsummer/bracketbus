import { DataSource } from 'typeorm';
import { getDatabaseConfig } from './database/database.config';

export const AppDataSource = new DataSource(getDatabaseConfig());

