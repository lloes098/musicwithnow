import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  synchronize: boolean;
  logging: boolean;
}

export const getDatabaseConfig = (configService: ConfigService): DatabaseConfig => {
  const nodeEnv = configService.get('NODE_ENV', 'development');
  
  return {
    type: configService.get('DB_TYPE', 'postgres') as 'postgres' | 'mysql' | 'sqlite',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'password'),
    database: configService.get('DB_NAME', 'ai_music_platform'),
    ssl: configService.get('DB_SSL', 'false') === 'true',
    synchronize: nodeEnv === 'development', // Only in development
    logging: nodeEnv === 'development',
  };
};

export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

export const CACHE_CONFIG = {
  ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default
  max: parseInt(process.env.CACHE_MAX || '1000'), // Max items in cache
};