import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Application } from '../entities/Application';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'database.sqlite',
  synchronize: true,
  logging: false,
  entities: [User, Application],
  subscribers: [],
  migrations: [],
}); 