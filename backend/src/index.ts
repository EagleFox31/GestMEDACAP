import knex from 'knex';
import { buildServer } from './server.js';
import { logger } from './config/logger.js';
import { config } from './config/env.js';
import { configureContainer } from './infra/container.js';

async function start() {
  try {
    // Initialize database connection
    const db = knex(require('../knexfile')[config.NODE_ENV || 'development']);
    
    // Configure dependency injection container
    const container = configureContainer(db);
    
    // Build the server with container
    const server = await buildServer(container);

    // Start the server
    await server.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });

    // Handle graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, closing server...`);
        await server.close();
        logger.info('Server closed');
        
        // Close database connection
        await db.destroy();
        logger.info('Database connection closed');
        
        process.exit(0);
      });
    });

    logger.info(`Server running at http://localhost:${config.PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

start();