import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create phases table
  await knex.schema.createTable('phases', (table) => {
    table.string('code', 10).primary().notNullable();
    table.string('name', 50).notNullable();
    table.text('description').nullable();
    table.integer('position').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create pages table
  await knex.schema.createTable('pages', (table) => {
    table.increments('id').primary();
    table.string('phase_code', 10).notNullable().references('code').inTable('phases').onDelete('CASCADE');
    table.string('title', 128).notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Index for faster lookups by phase
    table.index('phase_code');
  });

  // Create profiles table
  await knex.schema.createTable('profiles', (table) => {
    table.string('code', 10).primary().notNullable();
    table.string('name', 50).notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create tasks table
  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().notNullable();
    table.string('phase_code', 10).notNullable().references('code').inTable('phases').onDelete('CASCADE');
    table.integer('page_id').nullable().references('id').inTable('pages').onDelete('SET NULL');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.integer('priority').notNullable().defaultTo(3);
    table.uuid('owner_uuid').nullable();
    table.integer('progress').notNullable().defaultTo(0);
    table.uuid('created_by').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('planned_start').nullable();
    table.timestamp('planned_end').nullable();
    
    // Indexes for faster lookups
    table.index('phase_code');
    table.index('page_id');
    table.index('owner_uuid');
    table.index('created_by');
  });

  // Create subtasks table
  await knex.schema.createTable('subtasks', (table) => {
    table.uuid('id').primary().notNullable();
    table.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.boolean('done').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Index for faster lookups by task
    table.index('task_id');
  });

  // Create task_profiles table (many-to-many relationship)
  await knex.schema.createTable('task_profiles', (table) => {
    table.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.string('profile_code', 10).notNullable().references('code').inTable('profiles').onDelete('CASCADE');
    table.primary(['task_id', 'profile_code']);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Create task_raci table
  await knex.schema.createTable('task_raci', (table) => {
    table.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.uuid('user_uuid').notNullable();
    table.string('letter', 1).notNullable();
    table.primary(['task_id', 'user_uuid']);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Index for faster lookups by user
    table.index('user_uuid');
  });

  // Create subtask_raci table
  await knex.schema.createTable('subtask_raci', (table) => {
    table.uuid('subtask_id').notNullable().references('id').inTable('subtasks').onDelete('CASCADE');
    table.uuid('user_uuid').notNullable();
    table.string('letter', 1).notNullable();
    table.primary(['subtask_id', 'user_uuid']);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    // Index for faster lookups by user
    table.index('user_uuid');
  });

  // Create attachments table
  await knex.schema.createTable('attachments', (table) => {
    table.uuid('id').primary().notNullable();
    table.uuid('task_id').notNullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.string('file_path', 255).notNullable();
    table.string('file_name', 255).notNullable();
    table.string('mime_type', 100).notNullable();
    table.integer('size_bytes').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    // Index for faster lookups by task
    table.index('task_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  await knex.schema.dropTableIfExists('attachments');
  await knex.schema.dropTableIfExists('subtask_raci');
  await knex.schema.dropTableIfExists('task_raci');
  await knex.schema.dropTableIfExists('task_profiles');
  await knex.schema.dropTableIfExists('subtasks');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('profiles');
  await knex.schema.dropTableIfExists('pages');
  await knex.schema.dropTableIfExists('phases');
}