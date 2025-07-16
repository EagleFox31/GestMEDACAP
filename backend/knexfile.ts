import dotenv from 'dotenv';
import { Knex } from 'knex';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Default configuration
const defaultConfig: Knex.Config = {
  client: 'pg',
  connection: process.env.DB_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'medacap',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  migrations: {
    directory: path.join(__dirname, 'src/adapters/db/knex/migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.join(__dirname, 'src/adapters/db/knex/seeds'),
    extension: 'ts',
  },
  pool: {
    min: 2,
    max: 10,
  },
  debug: process.env.KNEX_DEBUG === 'true',
};

// Environment specific configurations
const config: Record<string, Knex.Config> = {
  development: {
    ...defaultConfig,
  },
  test: {
    ...defaultConfig,
    connection: process.env.TEST_DB_URL || {
      ...defaultConfig.connection as Knex.PgConnectionConfig,
      database: process.env.TEST_DB_NAME || 'medacap_test',
    },
    pool: {
      min: 1,
      max: 5,
    },
  },
  production: {
    ...defaultConfig,
    pool: {
      min: 5,
      max: 30,
    },
    // Disable debug in production
    debug: false,
  },
};

// Export the configuration for the current environment
export default config;
module.exports = config;