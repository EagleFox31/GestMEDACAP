import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Step 1: Create ENUMs first
  await knex.raw("CREATE TYPE role_code AS ENUM ('CP','RF','DEV','STG','UF')");
  await knex.raw("CREATE TYPE phase_code AS ENUM ('M','E','D','A','C','A2','P')");
  await knex.raw("CREATE TYPE raci_letter AS ENUM ('R','A','C','I')");

  // Step 2: Backup existing data before changing table structures
  
  // Backup phases
  await knex.schema.createTable('phases_backup', table => {
    table.string('code').primary();
    table.string('name').notNullable();
    table.text('description');
    table.integer('position').notNullable();
  });
  await knex.raw('INSERT INTO phases_backup SELECT code, name, description, position FROM phases');
  
  // Backup pages
  await knex.schema.createTable('pages_backup', table => {
    table.increments('id').primary();
    table.string('phase_code').references('code').inTable('phases_backup');
    table.string('title').notNullable();
    table.text('description');
  });
  await knex.raw('INSERT INTO pages_backup SELECT id, phase_code, title, description FROM pages');
  
  // Backup profiles
  await knex.schema.createTable('profiles_backup', table => {
    table.string('code').primary();
    table.string('name').notNullable();
    table.text('description');
  });
  await knex.raw('INSERT INTO profiles_backup SELECT code, name, description FROM profiles');

  // Backup tasks (with ID conversion)
  await knex.schema.createTable('tasks_backup', table => {
    table.uuid('old_id').notNullable();
    table.integer('new_id').notNullable();
    table.string('phase_code');
    table.integer('page_id');
    table.string('title').notNullable();
    table.text('description');
    table.integer('priority').notNullable();
    table.uuid('owner_uuid');
    table.integer('progress').notNullable();
    table.uuid('created_by').notNullable();
  });
  
  // Create sequences for new serial IDs
  await knex.raw('CREATE SEQUENCE task_id_seq');
  await knex.raw('CREATE SEQUENCE subtask_id_seq');
  await knex.raw('CREATE SEQUENCE attachment_id_seq');
  
  // Insert tasks with new serial IDs
  const tasks = await knex('tasks').select('*');
  for (const task of tasks) {
    const newId = await knex.raw('SELECT nextval(\'task_id_seq\')');
    await knex('tasks_backup').insert({
      old_id: task.id,
      new_id: newId.rows[0].nextval,
      phase_code: task.phase_code,
      page_id: task.page_id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      owner_uuid: task.owner_uuid,
      progress: task.progress,
      created_by: task.created_by
    });
  }
  
  // Backup subtasks (with ID conversion)
  await knex.schema.createTable('subtasks_backup', table => {
    table.uuid('old_id').notNullable();
    table.integer('new_id').notNullable();
    table.integer('task_id').notNullable(); // References the new task ID
    table.string('title').notNullable();
    table.boolean('done').notNullable();
  });
  
  // Insert subtasks with new serial IDs
  const subtasks = await knex('subtasks').select('*');
  for (const subtask of subtasks) {
    const newId = await knex.raw('SELECT nextval(\'subtask_id_seq\')');
    const taskMapping = await knex('tasks_backup').where('old_id', subtask.task_id).first();
    if (taskMapping) {
      await knex('subtasks_backup').insert({
        old_id: subtask.id,
        new_id: newId.rows[0].nextval,
        task_id: taskMapping.new_id,
        title: subtask.title,
        done: subtask.done
      });
    }
  }
  
  // Backup task_raci
  await knex.schema.createTable('task_raci_backup', table => {
    table.integer('task_id').notNullable(); // References the new task ID
    table.uuid('user_uuid').notNullable();
    table.string('letter', 1).notNullable();
  });
  
  // Convert task_raci records
  const taskRacis = await knex('task_raci').select('*');
  for (const raci of taskRacis) {
    const taskMapping = await knex('tasks_backup').where('old_id', raci.task_id).first();
    if (taskMapping) {
      await knex('task_raci_backup').insert({
        task_id: taskMapping.new_id,
        user_uuid: raci.user_uuid,
        letter: raci.letter
      });
    }
  }
  
  // Backup subtask_raci
  await knex.schema.createTable('subtask_raci_backup', table => {
    table.integer('subtask_id').notNullable(); // References the new subtask ID
    table.uuid('user_uuid').notNullable();
    table.string('letter', 1).notNullable();
  });
  
  // Convert subtask_raci records
  const subtaskRacis = await knex('subtask_raci').select('*');
  for (const raci of subtaskRacis) {
    const subtaskMapping = await knex('subtasks_backup').where('old_id', raci.subtask_id).first();
    if (subtaskMapping) {
      await knex('subtask_raci_backup').insert({
        subtask_id: subtaskMapping.new_id,
        user_uuid: raci.user_uuid,
        letter: raci.letter
      });
    }
  }
  
  // Backup task_profiles
  await knex.schema.createTable('task_profile_backup', table => {
    table.integer('task_id').notNullable(); // References the new task ID
    table.string('profile_code', 8).notNullable();
  });
  
  // Convert task_profiles records
  const taskProfiles = await knex('task_profiles').select('*');
  for (const profile of taskProfiles) {
    const taskMapping = await knex('tasks_backup').where('old_id', profile.task_id).first();
    if (taskMapping) {
      await knex('task_profile_backup').insert({
        task_id: taskMapping.new_id,
        profile_code: profile.profile_code
      });
    }
  }
  
  // Backup attachments
  await knex.schema.createTable('attachments_backup', table => {
    table.uuid('old_id').notNullable();
    table.integer('new_id').notNullable();
    table.integer('task_id').notNullable(); // References the new task ID
    table.string('png_path').notNullable();
    table.string('json_path').notNullable();
    table.integer('size_bytes').notNullable();
  });
  
  // Convert attachments
  const attachments = await knex('attachments').select('*');
  for (const attachment of attachments) {
    const newId = await knex.raw('SELECT nextval(\'attachment_id_seq\')');
    const taskMapping = await knex('tasks_backup').where('old_id', attachment.task_id).first();
    if (taskMapping) {
      await knex('attachments_backup').insert({
        old_id: attachment.id,
        new_id: newId.rows[0].nextval,
        task_id: taskMapping.new_id,
        png_path: attachment.file_path, // Use file_path as png_path
        json_path: attachment.file_path.replace('.png', '.json'), // Create json_path
        size_bytes: attachment.size_bytes
      });
    }
  }
  
  // Step 3: Drop existing tables
  await knex.schema.dropTableIfExists('attachments');
  await knex.schema.dropTableIfExists('subtask_raci');
  await knex.schema.dropTableIfExists('task_raci');
  await knex.schema.dropTableIfExists('task_profiles');
  await knex.schema.dropTableIfExists('subtasks');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('pages');
  await knex.schema.dropTableIfExists('profiles');
  await knex.schema.dropTableIfExists('phases');
  await knex.schema.dropTableIfExists('users');
  
  // Step 4: Create new tables according to the documentation
  
  // User table (singular)
  await knex.schema.createTable('user', table => {
    table.uuid('uuid').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('display_name', 64).notNullable();
    table.specificType('role', 'role_code').notNullable();
  });
  
  // Session table
  await knex.schema.createTable('session', table => {
    table.uuid('sid').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_uuid').notNullable().references('uuid').inTable('user').onDelete('CASCADE');
    table.specificType('role_active', 'role_code').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
  });
  
  // Device_user table
  await knex.schema.createTable('device_user', table => {
    table.uuid('client_id').primary();
    table.uuid('user_uuid').notNullable().references('uuid').inTable('user').onDelete('CASCADE');
    table.timestamp('first_seen').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen').notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_device_user_user ON device_user(user_uuid)');
  
  // Phase table
  await knex.schema.createTable('phase', table => {
    table.specificType('code', 'phase_code').primary();
    table.string('name', 32).notNullable();
    table.smallint('position').notNullable();
  });
  
  // Page table
  await knex.schema.createTable('page', table => {
    table.increments('id').primary();
    table.specificType('phase_code', 'phase_code').references('code').inTable('phase');
    table.string('title', 128).notNullable();
    table.text('description');
    table.unique(['phase_code', 'title']);
  });
  
  // Task table
  await knex.schema.createTable('task', table => {
    table.increments('id').primary();
    table.specificType('phase_code', 'phase_code').references('code').inTable('phase');
    table.integer('page_id').references('id').inTable('page');
    table.string('title', 256).notNullable();
    table.text('description');
    table.smallint('priority').notNullable();
    table.uuid('owner_uuid').references('uuid').inTable('user');
    table.decimal('progress', 5, 2).notNullable().defaultTo(0);
    table.uuid('created_by').notNullable().references('uuid').inTable('user');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
  
  // SubTask table
  await knex.schema.createTable('subtask', table => {
    table.increments('id').primary();
    table.integer('task_id').notNullable().references('id').inTable('task').onDelete('CASCADE');
    table.string('title', 256).notNullable();
    table.boolean('done').notNullable().defaultTo(false);
  });
  
  // Task_raci table
  await knex.schema.createTable('task_raci', table => {
    table.integer('task_id').references('id').inTable('task').onDelete('CASCADE');
    table.uuid('user_uuid').references('uuid').inTable('user').onDelete('CASCADE');
    table.specificType('letter', 'raci_letter').notNullable();
    table.primary(['task_id', 'user_uuid']);
  });
  
  // Subtask_raci table
  await knex.schema.createTable('subtask_raci', table => {
    table.integer('subtask_id').references('id').inTable('subtask').onDelete('CASCADE');
    table.uuid('user_uuid').references('uuid').inTable('user').onDelete('CASCADE');
    table.specificType('letter', 'raci_letter').notNullable();
    table.primary(['subtask_id', 'user_uuid']);
  });
  
  // Profile table
  await knex.schema.createTable('profile', table => {
    table.string('code', 8).primary();
    table.string('name', 64).notNullable();
  });
  
  // Task_profile table
  await knex.schema.createTable('task_profile', table => {
    table.integer('task_id').references('id').inTable('task').onDelete('CASCADE');
    table.string('profile_code', 8).references('code').inTable('profile').onDelete('CASCADE');
    table.primary(['task_id', 'profile_code']);
  });
  
  // Attachment table
  await knex.schema.createTable('attachment', table => {
    table.increments('id').primary();
    table.integer('task_id').notNullable().references('id').inTable('task').onDelete('CASCADE');
    table.string('png_path', 256).notNullable();
    table.string('json_path', 256).notNullable();
    table.integer('size_bytes').notNullable();
  });
  
  // Add constraints after table creation
  await knex.raw('ALTER TABLE "task" ADD CONSTRAINT "task_priority_check" CHECK (priority BETWEEN 1 AND 5)');
  await knex.raw('ALTER TABLE "attachment" ADD CONSTRAINT "attachment_size_bytes_check" CHECK (size_bytes <= 2048000)');
  
  // Step 5: Create full-text search indexes
  await knex.raw(`
    CREATE INDEX idx_task_fulltext ON task USING GIN (to_tsvector('french', coalesce(title,'') || ' ' || coalesce(description,'')))
  `);
  
  await knex.raw(`
    CREATE INDEX idx_subtask_fulltext ON subtask USING GIN (to_tsvector('french', title))
  `);
  
  // Step 6: Create triggers
  await knex.raw(`
    CREATE OR REPLACE FUNCTION trg_updated_at() RETURNS trigger AS $$
    BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
  `);
  
  await knex.raw(`
    CREATE TRIGGER task_updated BEFORE UPDATE ON task FOR EACH ROW EXECUTE FUNCTION trg_updated_at();
  `);
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_task_progress() RETURNS trigger AS $$
    BEGIN
      UPDATE task
        SET progress = (
          SELECT ROUND(COALESCE(AVG(CASE WHEN done THEN 100 ELSE 0 END),0),2)
          FROM subtask WHERE task_id = NEW.task_id
        )
      WHERE id = NEW.task_id;
      RETURN NEW;
    END;$$ LANGUAGE plpgsql;
  `);
  
  await knex.raw(`
    CREATE TRIGGER subtask_progress AFTER INSERT OR UPDATE OF done ON subtask
    FOR EACH ROW EXECUTE FUNCTION fn_task_progress();
  `);
  
  // Step 7: Restore data from backup tables
  
  // Migrate user data from users table
  const users = await knex.schema.hasTable('users') ? await knex('users').select('*') : [];
  if (users.length > 0) {
    await knex('user').insert(users.map(u => ({
      uuid: u.uuid,
      display_name: u.display_name,
      role: u.role
    })));
  }
  
  // Restore phases
  await knex('phase').insert(
    await knex('phases_backup').select('code', 'name', 'position')
  );
  
  // Restore profiles
  await knex('profile').insert(
    await knex('profiles_backup').select('code', 'name')
  );
  
  // Restore pages
  await knex('page').insert(
    await knex('pages_backup').select('id', 'phase_code', 'title', 'description')
  );
  
  // Restore tasks
  const taskMappings = await knex('tasks_backup').select('*');
  for (const task of taskMappings) {
    await knex('task').insert({
      id: task.new_id,
      phase_code: task.phase_code,
      page_id: task.page_id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      owner_uuid: task.owner_uuid,
      progress: task.progress,
      created_by: task.created_by,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }
  
  // Restore subtasks
  await knex('subtask').insert(
    (await knex('subtasks_backup').select('new_id as id', 'task_id', 'title', 'done'))
  );
  
  // Restore task_raci
  await knex('task_raci').insert(
    await knex('task_raci_backup').select('task_id', 'user_uuid', 'letter')
  );
  
  // Restore subtask_raci
  await knex('subtask_raci').insert(
    await knex('subtask_raci_backup').select('subtask_id', 'user_uuid', 'letter')
  );
  
  // Restore task_profile
  await knex('task_profile').insert(
    await knex('task_profile_backup').select('task_id', 'profile_code')
  );
  
  // Restore attachments
  await knex('attachment').insert(
    (await knex('attachments_backup').select('new_id as id', 'task_id', 'png_path', 'json_path', 'size_bytes'))
  );
  
  // Step 8: Clean up backup tables
  await knex.schema.dropTableIfExists('attachments_backup');
  await knex.schema.dropTableIfExists('task_profile_backup');
  await knex.schema.dropTableIfExists('subtask_raci_backup');
  await knex.schema.dropTableIfExists('task_raci_backup');
  await knex.schema.dropTableIfExists('subtasks_backup');
  await knex.schema.dropTableIfExists('tasks_backup');
  await knex.schema.dropTableIfExists('profiles_backup');
  await knex.schema.dropTableIfExists('pages_backup');
  await knex.schema.dropTableIfExists('phases_backup');
}

export async function down(knex: Knex): Promise<void> {
  // Revert the schema changes if necessary
  // First drop the triggers
  await knex.raw('DROP TRIGGER IF EXISTS task_updated ON task');
  await knex.raw('DROP TRIGGER IF EXISTS subtask_progress ON subtask');
  await knex.raw('DROP FUNCTION IF EXISTS trg_updated_at()');
  await knex.raw('DROP FUNCTION IF EXISTS fn_task_progress()');
  
  // Drop the tables in reverse order
  await knex.schema.dropTableIfExists('attachment');
  await knex.schema.dropTableIfExists('task_profile');
  await knex.schema.dropTableIfExists('subtask_raci');
  await knex.schema.dropTableIfExists('task_raci');
  await knex.schema.dropTableIfExists('subtask');
  await knex.schema.dropTableIfExists('task');
  await knex.schema.dropTableIfExists('page');
  await knex.schema.dropTableIfExists('profile');
  await knex.schema.dropTableIfExists('device_user');
  await knex.schema.dropTableIfExists('session');
  await knex.schema.dropTableIfExists('user');
  await knex.schema.dropTableIfExists('phase');
  
  // Drop the enums
  await knex.raw('DROP TYPE IF EXISTS raci_letter');
  await knex.raw('DROP TYPE IF EXISTS phase_code');
  await knex.raw('DROP TYPE IF EXISTS role_code');
  
  // Recreate the original tables if needed
  // This would involve recreating the original schema
}