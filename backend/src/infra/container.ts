import { createContainer, asClass, asValue, asFunction, InjectionMode } from 'awilix';
import { Knex } from 'knex';
import path from 'path';

// Database repositories
import { PhaseKnexRepository } from '../adapters/db/knex/repositories/PhaseKnexRepository';
import { PageKnexRepository } from '../adapters/db/knex/repositories/PageKnexRepository';
import { ProfileKnexRepository } from '../adapters/db/knex/repositories/ProfileKnexRepository';
import { TaskKnexRepository } from '../adapters/db/knex/repositories/TaskKnexRepository';
import { SubTaskKnexRepository } from '../adapters/db/knex/repositories/SubTaskKnexRepository';
import { RaciKnexRepository } from '../adapters/db/knex/repositories/RaciKnexRepository';

// Storage
import { FileSystemAttachmentStore } from '../adapters/storage/FileSystemAttachmentStore';

// Config
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * Configure the dependency injection container
 * @param db Knex database instance
 */
export function configureContainer(db: Knex) {
  const container = createContainer({
    injectionMode: InjectionMode.PROXY
  });

  // Register core dependencies
  container.register({
    db: asValue(db),
    logger: asValue(logger),
    config: asValue(config)
  });

  // Register repositories
  container.register({
    phaseRepository: asClass(PhaseKnexRepository).singleton(),
    pageRepository: asClass(PageKnexRepository).singleton(),
    profileRepository: asClass(ProfileKnexRepository).singleton(),
    taskRepository: asClass(TaskKnexRepository).singleton(),
    subtaskRepository: asClass(SubTaskKnexRepository).singleton(),
    raciRepository: asClass(RaciKnexRepository).singleton()
  });

  // Register storage
  container.register({
    attachmentStore: asClass(FileSystemAttachmentStore)
      .singleton()
      .inject(() => ({
        basePath: path.join(process.cwd(), 'uploads')
      }))
  });

  // Register application services (will be implemented in the next phase)
  container.register({
    // Will register service classes in future phases
  });

  return container;
}