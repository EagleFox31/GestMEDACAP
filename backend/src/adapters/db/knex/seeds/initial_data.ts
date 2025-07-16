import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Clean up existing data
  await knex('attachment').del();
  await knex('subtask_raci').del();
  await knex('task_raci').del();
  await knex('task_profile').del();
  await knex('subtask').del();
  await knex('task').del();
  await knex('page').del();
  await knex('profile').del();
  await knex('phase').del();
  await knex('session').del();
  await knex('device_user').del();
  await knex('user').del();

  // Create MEDACAP phases
  const phases = [
    { code: 'M', name: 'Mesurer', description: 'Phase de mesure', position: 1 },
    { code: 'E', name: 'Exploiter', description: 'Phase d\'exploitation des données', position: 2 },
    { code: 'D', name: 'Définir', description: 'Phase de définition', position: 3 },
    { code: 'A', name: 'Acquérir', description: 'Phase d\'acquisition', position: 4 },
    { code: 'C', name: 'Certifier', description: 'Phase de certification', position: 5 },
    { code: 'A2', name: 'Appliquer', description: 'Phase d\'application', position: 6 },
    { code: 'P', name: 'Performer', description: 'Phase de performance', position: 7 },
  ];

  await knex('phase').insert(phases);

  // Create profiles utilisateurs finaux (cibles du LMS)
  const profiles = [
    { code: 'TEC', name: 'Technicien', description: 'Personnel technique de terrain' },
    { code: 'MAN', name: 'Manager', description: 'Responsable d\'équipe' },
    { code: 'DPS', name: 'Délégué à la Protection des Sites', description: 'Responsable de la sécurité des sites' },
    { code: 'DOP', name: 'Directeur Opérationnel de Production', description: 'Responsable des opérations de production' },
    { code: 'DF', name: 'Directeur Filiale', description: 'Directeur de filiale' },
    { code: 'DG', name: 'Directeur Groupe', description: 'Directeur au niveau groupe' },
    { code: 'RH', name: 'Ressources Humaines', description: 'Personnel RH' },
    { code: 'AF', name: 'Administrateur Filiale', description: 'Administrateur au niveau filiale' },
    { code: 'SA', name: 'Super Administrateur', description: 'Administrateur système global' },
  ];

  await knex('profile').insert(profiles);

  // Création des rôles projet internes avec les noms réels
  const users = [
    {
      uuid: 'cp-' + uuidv4(),
      display_name: 'Laurent Gonin',
      role: 'CP'
    },
    {
      uuid: 'rf-' + uuidv4(),
      display_name: 'André Yves Bokally',
      role: 'RF'
    },
    {
      uuid: 'dev-' + uuidv4(),
      display_name: 'Jennifer Aka\'a',
      role: 'DEV'
    },
    {
      uuid: 'stg-' + uuidv4(),
      display_name: 'Ibrahim Mbowoui',
      role: 'STG'
    },
    {
      uuid: 'uf-' + uuidv4(),
      display_name: 'Utilisateur Test',
      role: 'UF'
    }
  ];

  await knex('user').insert(users);

  // Create sample pages pour MEDACAP (uniquement phases M, E, D pour l'instant)
  const pages = [
    { phase_code: 'M', title: 'Dashboard KPI', description: 'Tableau de bord des indicateurs clés de performance' },
    { phase_code: 'M', title: 'Audit initial', description: 'Analyse de l\'existant' },
    { phase_code: 'E', title: 'Dashboard analytique', description: 'Tableau de bord d\'analyse des données collectées' },
    { phase_code: 'E', title: 'Synthèse des métriques', description: 'Consolidation des indicateurs clés' },
    { phase_code: 'D', title: 'Définition des objectifs', description: 'Établissement des cibles et objectifs du LMS' },
    { phase_code: 'D', title: 'Formalisation des besoins', description: 'Documentation des besoins fonctionnels' },
  ];

  const pageIds = await knex('page').insert(pages).returning('id');

  // Create sample tasks (uniquement phases M, E, D pour l'instant)
  const tasks = [
    {
      id: uuidv4(),
      phase_code: 'M',
      page_id: pageIds[0],
      title: 'Analyse des besoins pour le module d\'authentification',
      description: 'Analyser les besoins fonctionnels et techniques pour le module d\'authentification du LMS',
      priority: 1,
      owner_uuid: users[1].uuid, // André Yves Bokally est propriétaire
      progress: 100,
      created_by: users[0].uuid, // Créé par Laurent Gonin
      planned_start: new Date(2025, 5, 1),
      planned_end: new Date(2025, 5, 7),
    },
    {
      id: uuidv4(),
      phase_code: 'M',
      page_id: pageIds[1],
      title: 'Audit technique de l\'existant',
      description: 'Réaliser un audit technique des systèmes existants et identifier les points d\'intégration',
      priority: 1,
      owner_uuid: users[2].uuid, // Jennifer Aka'a est propriétaire
      progress: 85,
      created_by: users[0].uuid, // Créé par Laurent Gonin
      planned_start: new Date(2025, 5, 3),
      planned_end: new Date(2025, 5, 8),
    },
    {
      id: uuidv4(),
      phase_code: 'E',
      page_id: pageIds[2],
      title: 'Récupération des données utilisateurs',
      description: 'Extraire et analyser les données des utilisateurs pour le module de profil',
      priority: 2,
      owner_uuid: users[2].uuid, // Jennifer Aka'a est propriétaire
      progress: 75,
      created_by: users[1].uuid, // Créé par André Yves Bokally
      planned_start: new Date(2025, 5, 5),
      planned_end: new Date(2025, 5, 10),
    },
    {
      id: uuidv4(),
      phase_code: 'E',
      page_id: pageIds[3],
      title: 'Analyse des métriques d\'apprentissage',
      description: 'Analyser les métriques d\'apprentissage et créer les tableaux de bord de synthèse',
      priority: 2,
      owner_uuid: users[1].uuid, // André Yves Bokally est propriétaire
      progress: 60,
      created_by: users[0].uuid, // Créé par Laurent Gonin
      planned_start: new Date(2025, 5, 7),
      planned_end: new Date(2025, 5, 12),
    },
    {
      id: uuidv4(),
      phase_code: 'D',
      page_id: pageIds[4],
      title: 'Définition des scénarios de formation',
      description: 'Élaborer les user stories et scénarios pour les parcours de formation',
      priority: 1,
      owner_uuid: users[1].uuid, // André Yves Bokally est propriétaire
      progress: 50,
      created_by: users[1].uuid, // Créé par André Yves Bokally
      planned_start: new Date(2025, 5, 10),
      planned_end: new Date(2025, 5, 20),
    },
    {
      id: uuidv4(),
      phase_code: 'D',
      page_id: pageIds[5],
      title: 'Spécification de l\'architecture technique',
      description: 'Définir l\'architecture technique du LMS et ses composants',
      priority: 1,
      owner_uuid: users[2].uuid, // Jennifer Aka'a est propriétaire
      progress: 40,
      created_by: users[1].uuid, // Créé par André Yves Bokally
      planned_start: new Date(2025, 5, 15),
      planned_end: new Date(2025, 5, 25),
    },
  ];

  await knex('task').insert(tasks);

  // Create sample subtasks
  const subtasks = [];
  
  // Pour la première tâche (Analyse des besoins pour le module d'authentification)
  subtasks.push(
    {
      id: uuidv4(),
      task_id: tasks[0].id,
      title: 'Identifier les KPIs pertinents',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[0].id,
      title: 'Concevoir les visualisations du dashboard',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[0].id,
      title: 'Implémenter le système d\'alertes',
      done: true,
    }
  );

  // Pour la deuxième tâche (Audit technique de l'existant)
  subtasks.push(
    {
      id: uuidv4(),
      task_id: tasks[1].id,
      title: 'Inventaire des systèmes existants',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[1].id,
      title: 'Analyse des points d\'intégration',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[1].id,
      title: 'Documentation technique de l\'existant',
      done: false,
    }
  );

  // Pour la troisième tâche (Récupération des données utilisateurs)
  subtasks.push(
    {
      id: uuidv4(),
      task_id: tasks[2].id,
      title: 'Collecter les données d\'utilisation',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[2].id,
      title: 'Segmenter les utilisateurs',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[2].id,
      title: 'Générer des rapports d\'analyse',
      done: false,
    }
  );

  // Pour la quatrième tâche (Analyse des métriques d'apprentissage)
  subtasks.push(
    {
      id: uuidv4(),
      task_id: tasks[3].id,
      title: 'Définir les métriques clés d\'apprentissage',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[3].id,
      title: 'Créer les tableaux de bord',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[3].id,
      title: 'Tester avec des données échantillons',
      done: false,
    }
  );

  // Pour la cinquième tâche (Définition des scénarios de formation)
  subtasks.push(
    {
      id: uuidv4(),
      task_id: tasks[4].id,
      title: 'Analyser les besoins en compétences',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[4].id,
      title: 'Définir les parcours d\'apprentissage',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[4].id,
      title: 'Établir les critères d\'évaluation',
      done: false,
    }
  );

  // Pour la sixième tâche (Spécification de l'architecture technique)
  subtasks.push(
    {
      id: uuidv4(),
      task_id: tasks[5].id,
      title: 'Définir l\'architecture générale',
      done: true,
    },
    {
      id: uuidv4(),
      task_id: tasks[5].id,
      title: 'Spécifier les composants techniques',
      done: false,
    },
    {
      id: uuidv4(),
      task_id: tasks[5].id,
      title: 'Documenter les interfaces API',
      done: false,
    }
  );

  await knex('subtask').insert(subtasks);

  // Create sample task-profile assignments
  const taskProfiles = [
    { task_id: tasks[0].id, profile_code: 'DOP' },
    { task_id: tasks[0].id, profile_code: 'MAN' },
    { task_id: tasks[0].id, profile_code: 'TEC' },
    { task_id: tasks[1].id, profile_code: 'DPS' },
    { task_id: tasks[1].id, profile_code: 'MAN' },
    { task_id: tasks[1].id, profile_code: 'TEC' },
    { task_id: tasks[2].id, profile_code: 'DPS' },
    { task_id: tasks[2].id, profile_code: 'MAN' },
    { task_id: tasks[2].id, profile_code: 'DF' },
    { task_id: tasks[3].id, profile_code: 'DOP' },
    { task_id: tasks[3].id, profile_code: 'DF' },
    { task_id: tasks[3].id, profile_code: 'MAN' },
    { task_id: tasks[4].id, profile_code: 'TEC' },
    { task_id: tasks[4].id, profile_code: 'DPS' },
    { task_id: tasks[4].id, profile_code: 'MAN' },
    { task_id: tasks[5].id, profile_code: 'TEC' },
    { task_id: tasks[5].id, profile_code: 'DOP' },
    { task_id: tasks[5].id, profile_code: 'DF' },
  ];

  await knex('task_profile').insert(taskProfiles);

  // Create sample RACI assignments
  const now = new Date();
  const taskRacis = [
    // Pour la première tâche (Analyse des besoins pour le module d'authentification)
    { task_id: tasks[0].id, user_uuid: users[0].uuid, letter: 'R', created_at: now, updated_at: now }, // CP est Responsable
    { task_id: tasks[0].id, user_uuid: users[1].uuid, letter: 'A', created_at: now, updated_at: now }, // RF est Accountable
    { task_id: tasks[0].id, user_uuid: users[4].uuid, letter: 'C', created_at: now, updated_at: now }, // UF est Consulté
    
    // Pour la deuxième tâche (Audit technique de l'existant)
    { task_id: tasks[1].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { task_id: tasks[1].id, user_uuid: users[1].uuid, letter: 'A', created_at: now, updated_at: now }, // RF est Accountable
    { task_id: tasks[1].id, user_uuid: users[0].uuid, letter: 'C', created_at: now, updated_at: now }, // CP est Consulté
    { task_id: tasks[1].id, user_uuid: users[3].uuid, letter: 'I', created_at: now, updated_at: now }, // STG est Informé
    
    // Pour la troisième tâche (Récupération des données utilisateurs)
    { task_id: tasks[2].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { task_id: tasks[2].id, user_uuid: users[1].uuid, letter: 'A', created_at: now, updated_at: now }, // RF est Accountable
    { task_id: tasks[2].id, user_uuid: users[0].uuid, letter: 'I', created_at: now, updated_at: now }, // CP est Informé
    
    // Pour la quatrième tâche (Analyse des métriques d'apprentissage)
    { task_id: tasks[3].id, user_uuid: users[1].uuid, letter: 'R', created_at: now, updated_at: now }, // RF est Responsable
    { task_id: tasks[3].id, user_uuid: users[0].uuid, letter: 'A', created_at: now, updated_at: now }, // CP est Accountable
    { task_id: tasks[3].id, user_uuid: users[4].uuid, letter: 'C', created_at: now, updated_at: now }, // UF est Consulté
    
    // Pour la cinquième tâche (Définition des scénarios de formation)
    { task_id: tasks[4].id, user_uuid: users[1].uuid, letter: 'R', created_at: now, updated_at: now }, // RF est Responsable
    { task_id: tasks[4].id, user_uuid: users[0].uuid, letter: 'A', created_at: now, updated_at: now }, // CP est Accountable
    { task_id: tasks[4].id, user_uuid: users[4].uuid, letter: 'C', created_at: now, updated_at: now }, // UF est Consulté
    { task_id: tasks[4].id, user_uuid: users[2].uuid, letter: 'I', created_at: now, updated_at: now }, // DEV est Informé
    
    // Pour la sixième tâche (Spécification de l'architecture technique)
    { task_id: tasks[5].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { task_id: tasks[5].id, user_uuid: users[0].uuid, letter: 'A', created_at: now, updated_at: now }, // CP est Accountable
    { task_id: tasks[5].id, user_uuid: users[3].uuid, letter: 'C', created_at: now, updated_at: now }, // STG est Consulté
    { task_id: tasks[5].id, user_uuid: users[1].uuid, letter: 'I', created_at: now, updated_at: now }, // RF est Informé
  ];

  await knex('task_raci').insert(taskRacis);

  // Create sample subtask RACI assignments
  const subtaskRacis = [
    // Sous-tâches de la première tâche (Analyse des besoins pour le module d'authentification)
    { subtask_id: subtasks[0].id, user_uuid: users[1].uuid, letter: 'R', created_at: now, updated_at: now }, // RF est Responsable
    { subtask_id: subtasks[1].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { subtask_id: subtasks[2].id, user_uuid: users[3].uuid, letter: 'R', created_at: now, updated_at: now }, // STG est Responsable
    
    // Sous-tâches de la deuxième tâche (Audit technique de l'existant)
    { subtask_id: subtasks[3].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { subtask_id: subtasks[4].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { subtask_id: subtasks[5].id, user_uuid: users[3].uuid, letter: 'R', created_at: now, updated_at: now }, // STG est Responsable
    { subtask_id: subtasks[5].id, user_uuid: users[1].uuid, letter: 'A', created_at: now, updated_at: now }, // RF est Accountable
    
    // Sous-tâches de la troisième tâche (Récupération des données utilisateurs)
    { subtask_id: subtasks[6].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { subtask_id: subtasks[7].id, user_uuid: users[3].uuid, letter: 'R', created_at: now, updated_at: now }, // STG est Responsable
    { subtask_id: subtasks[8].id, user_uuid: users[1].uuid, letter: 'A', created_at: now, updated_at: now }, // RF est Accountable
    
    // Sous-tâches de la quatrième tâche (Analyse des métriques d'apprentissage)
    { subtask_id: subtasks[9].id, user_uuid: users[1].uuid, letter: 'R', created_at: now, updated_at: now }, // RF est Responsable
    { subtask_id: subtasks[10].id, user_uuid: users[1].uuid, letter: 'R', created_at: now, updated_at: now }, // RF est Responsable
    { subtask_id: subtasks[11].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { subtask_id: subtasks[11].id, user_uuid: users[0].uuid, letter: 'A', created_at: now, updated_at: now }, // CP est Accountable
    
    // Sous-tâches de la cinquième tâche (Définition des scénarios de formation)
    { subtask_id: subtasks[12].id, user_uuid: users[1].uuid, letter: 'R', created_at: now, updated_at: now }, // RF est Responsable
    { subtask_id: subtasks[13].id, user_uuid: users[1].uuid, letter: 'R', created_at: now, updated_at: now }, // RF est Responsable
    { subtask_id: subtasks[14].id, user_uuid: users[0].uuid, letter: 'A', created_at: now, updated_at: now }, // CP est Accountable
    
    // Sous-tâches de la sixième tâche (Spécification de l'architecture technique)
    { subtask_id: subtasks[15].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { subtask_id: subtasks[16].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { subtask_id: subtasks[17].id, user_uuid: users[2].uuid, letter: 'R', created_at: now, updated_at: now }, // DEV est Responsable
    { subtask_id: subtasks[17].id, user_uuid: users[0].uuid, letter: 'A', created_at: now, updated_at: now }, // CP est Accountable
  ];

  await knex('subtask_raci').insert(subtaskRacis);
}