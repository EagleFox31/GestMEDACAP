# MEDACAP Project Manager – Architecture Base de Données (v1.2)

> **Version mise à jour – 16 juillet 2025 (complète)**
>
> Cette version **ré‑intègre l'ensemble des sections d'origine** (dictionnaire complet, journalisation, DDL exhaustif, etc.) tout en ajoutant la **nouvelle règle de verrouillage Nom ↔ Poste** (`device_user`). Aucune donnée antérieure n'est perdue.

---

## 1. Modélisation conceptuelle (MCD)

```mermaid
erDiagram
    USER ||--|{ SESSION : "ouvre"
    USER ||--|{ DEVICE_USER : "associe"
    USER ||--|{ TASK : "crée"

    USER {
        uuid PK
        display_name varchar
        role enum<<RoleCode>>
    }
    SESSION {
        sid PK
        user_uuid FK
        role_active enum<<RoleCode>>
        created_at timestamp
        expires_at timestamp
    }
    DEVICE_USER {
        client_id PK uuid
        user_uuid FK
        first_seen timestamp
        last_seen timestamp
    }

    PHASE ||--|{ PAGE : "contient"
    PHASE {
        code PK char(1)
        name varchar
        position int
    }
    PAGE {
        id PK
        phase_code FK
        title varchar
        description text
    }

    TASK ||--|{ SUBTASK : "compose"
    TASK ||--|{ TASK_RACI : "gère"
    TASK ||--|{ TASK_PROFILE : "impacte"
    TASK {
        id PK
        phase_code FK
        page_id FK
        title varchar
        description text
        priority int<<1-5>>
        owner_uuid FK nullable
        progress numeric
        created_by FK USER
        created_at timestamp
        updated_at timestamp
    }
    SUBTASK ||--|{ SUBTASK_RACI : "gère"
    SUBTASK {
        id PK
        task_id FK
        title varchar
        done boolean
    }
    TASK_RACI {
        task_id FK
        user_uuid FK
        letter enum(R,A,C,I)
        PK(task_id,user_uuid)
    }
    SUBTASK_RACI {
        subtask_id FK
        user_uuid FK
        letter enum(R,A,C,I)
        PK(subtask_id,user_uuid)
    }

    PROFILE {
        code PK
        name varchar
    }
    TASK_PROFILE {
        task_id FK
        profile_code FK
        PK(task_id,profile_code)
    }

    ATTACHMENT {
        id PK
        task_id FK
        png_path varchar
        json_path varchar
        size_bytes int
    }
```

### 1.1 Domaines & énumérations

```text
// Rôles projet internes (personnes travaillant sur le projet)
Enum RoleCode   = CP, RF, DEV, STG, UF

// Phases MEDACAP
Enum PhaseCode  = M, E, D, A, C, A2, P

// Lettres matrice RACI
Enum RaciLetter = R, A, C, I
```

---

## 2. Modélisation logique (schéma relationnel détaillé)

| Table             | Colonne                   | Type           | Null | PK | FK           | Commentaires                 |
| ----------------- | ------------------------- | -------------- | ---- | -- | ------------ | ---------------------------- |
| **user**          | uuid                      | `uuid`         | non  | ✔  | —            | `gen_random_uuid()`          |
|                   | display\_name             | `varchar(64)`  | non  | —  | —            | Nom affiché                  |
|                   | role                      | `role_code`    | non  | —  | —            | Rôle projet interne          |
| **session**       | sid                       | `uuid`         | non  | ✔  | —            | Cookie session               |
|                   | user\_uuid                | `uuid`         | non  | —  | user(uuid)   |                              |
|                   | role\_active              | `role_code`    | non  | —  | —            | Rôle utilisé pour la session |
|                   | created\_at / expires\_at | timestamptz    | non  | —  | —            | Durée 24 h                   |
| **device\_user**  | client\_id                | `uuid`         | non  | ✔  | —            | Identifiant poste (cookie)   |
|                   | user\_uuid                | `uuid`         | non  | —  | user(uuid)   | Nom verrouillé               |
|                   | first\_seen               | timestamptz    | non  | —  | —            | `now()`                      |
|                   | last\_seen                | timestamptz    | non  | —  | —            | Mise à jour login            |
| **phase**         | code                      | `char(1)`      | non  | ✔  | —            | Lettre MEDACAP               |
|                   | name                      | varchar(32)    | non  | —  | —            | Libellé                      |
|                   | position                  | smallint       | non  | —  | —            | Ordre d'affichage            |
| **page**          | id                        | serial         | non  | ✔  | —            |                              |
|                   | phase\_code               | char(1)        | non  | —  | phase(code)  |                              |
|                   | title                     | varchar(128)   | non  | —  | —            | Unique (phase,title)         |
|                   | description               | text           | oui  | —  | —            |                              |
| **task**          | id                        | serial         | non  | ✔  | —            |                              |
|                   | phase\_code               | char(1)        | non  | —  | phase(code)  |                              |
|                   | page\_id                  | int            | oui  | —  | page(id)     | nullable backlog             |
|                   | title                     | varchar(256)   | non  | —  | —            | Full‑text                    |
|                   | description               | text           | oui  | —  | —            |                              |
|                   | priority                  | smallint (1‑5) | non  | —  | —            | Check 1‑5                    |
|                   | owner\_uuid               | uuid           | oui  | —  | user(uuid)   |                              |
|                   | progress                  | numeric(5,2)   | non  | —  | —            | Trigger avg sous‑tâches      |
|                   | created\_by               | uuid           | non  | —  | user(uuid)   |                              |
|                   | created\_at / updated\_at | timestamptz    | non  | —  | —            |                              |
| **subtask**       | id                        | serial         | non  | ✔  | —            |                              |
|                   | task\_id                  | int            | non  | —  | task(id)     | cascade                      |
|                   | title                     | varchar(256)   | non  | —  | —            |                              |
|                   | done                      | boolean        | non  | —  | —            | default false                |
| **task\_raci**    | task\_id,user\_uuid       | composite      | non  | ✔  | task,user    | Lettre RACI                  |
| **subtask\_raci** | subtask\_id,user\_uuid    | composite      | non  | ✔  | subtask,user |                              |
| **profile**       | code                      | varchar(8)     | non  | ✔  | —            | Profil utilisateur final     |
|                   | name                      | varchar(64)    | non  | —  | —            |                              |
| **task\_profile** | task\_id,profile\_code    | composite      | non  | ✔  | task,profile |                              |
| **attachment**    | id                        | serial         | non  | ✔  | —            |                              |
|                   | task\_id                  | int            | non  | —  | task(id)     | cascade                      |
|                   | png\_path / json\_path    | varchar(256)   | non  | —  | —            | Double stockage              |
|                   | size\_bytes               | int            | non  | —  | —            | < 2 048 000                  |

---

### 2.1 Dictionnaire de données détaillé

> Ce dictionnaire décrit la **signification fonctionnelle** de chaque table et colonne, avec règles de gestion clés et exemples de valeurs. Il complète le schéma logique afin que tout·e développeur·e ou analyste puisse comprendre l'usage métier des données.

#### Table `user`

| Colonne        | Type          | Description fonctionnelle                                                                                                 | Exemple          |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `uuid`         | UUID (PK)     | Identifiant technique unique de l'utilisateur interne (pas l'utilisateur final).                                          | `82d3…`          |
| `display_name` | varchar(64)   | Nom affiché dans l'UI et les exports.                                                                                     | `"Alice Martin"` |
| `role`         | enum RoleCode | Rôle **interne** sur le projet (CP=Chef de Projet, RF=Responsable Formation, DEV=Développeur, STG=Stagiaire, UF=Utilisateur Final). | `DEV`            |

#### Table `session`

| Colonne       | Type           | Description                                             | Exemple            |
| ------------- | -------------- | ------------------------------------------------------- | ------------------ |
| `sid`         | UUID (PK)      | Identifiant de session Web (cookie).                    | `24f1…`            |
| `user_uuid`   | UUID FK `user` | Utilisateur connecté.                                   | —                  |
| `role_active` | enum RoleCode  | Rôle utilisé pour la session (≠ rôle stocké si switch). | `STG`              |
| `created_at`  | timestamptz    | Timestamp de création.                                  | `2025‑07‑15 10:05` |
| `expires_at`  | timestamptz    | Fin de validité (24 h).                                 | `2025‑07‑16 10:05` |

#### Table `device_user`

| Colonne      | Description fonctionnelle                              | Exemple            |
| ------------ | ------------------------------------------------------ | ------------------ |
| `client_id`  | UUID stocké en cookie `client_id` (poste). Durée 1 an. | `d0e4‑c1a2…`       |
| `user_uuid`  | Utilisateur verrouillé sur ce poste.                   | `82d3…`            |
| `first_seen` | Date/heure du 1ᵉʳ login réussi.                        | `2025‑07‑16 08:12` |
| `last_seen`  | MAJ à chaque login autorisé.                           | `2025‑07‑16 08:12` |

#### Table `phase`

| Colonne    | Type                | Description                      | Exemple     |
| ---------- | ------------------- | -------------------------------- | ----------- |
| `code`     | enum PhaseCode (PK) | Lettre de la phase MEDACAP.      | `M`         |
| `name`     | varchar(32)         | Libellé humain de la phase.      | `"Mesurer"` |
| `position` | smallint            | Ordre chronologique d'affichage. | `1`         |

#### Table `page`

| Colonne       | Type         | Description                             | Exemple                              |
| ------------- | ------------ | --------------------------------------- | ------------------------------------ |
| `id`          | serial (PK)  | Identifiant auto.                       | `7`                                  |
| `phase_code`  | PhaseCode FK | Phase à laquelle la page est rattachée. | `D`                                  |
| `title`       | varchar(128) | Titre fonctionnel de la page LMS.       | `"Sécurité électrique"`              |
| `description` | text         | Détail libre de la page.                | `"Module de formation sur les EPI…"` |

#### Table `task`

| Colonne                   | Type                    | Description                                    | Exemple                         |
| ------------------------- | ----------------------- | ---------------------------------------------- | ------------------------------- |
| `id`                      | serial (PK)             | ID tâche.                                      | `42`                            |
| `phase_code`              | PhaseCode FK            | Phase courante de la tâche (Kanban).           | `A`                             |
| `page_id`                 | int FK `page` nullable  | Page cible, ou NULL si backlog général.        | `7`                             |
| `title`                   | varchar(256)            | Titre court affiché sur les cartes Kanban.     | `"Implémenter endpoint /login"` |
| `description`             | text                    | Détails complets.                              | `"Doit valider le rôle sur…"`   |
| `priority`                | smallint (1‑5)          | Priorité P1 (critique) → P5 (mineure).         | `2`                             |
| `owner_uuid`              | UUID FK `user` nullable | Personne en charge, remplie après assignation. | —                               |
| `progress`                | numeric(5,2)            | % moyen de sous‑tâches terminées (trigger).    | `33.33`                         |
| `created_by`              | UUID FK `user`          | Créateur initial.                              | `82d3…`                         |
| `created_at`/`updated_at` | timestamptz             | Traces chrono.                                 | —                               |

#### Table `subtask`

| Colonne   | Type          | Description    | Exemple                    |
| --------- | ------------- | -------------- | -------------------------- |
| `id`      | serial (PK)   | ID sous‑tâche. | `108`                      |
| `task_id` | int FK `task` | Tâche parente. | `42`                       |
| `title`   | varchar(256)  | Intitulé ✅/❌.  | `"Valider middleware JWT"` |
| `done`    | boolean       | État.          | `false`                    |

#### Table `task_raci` / `subtask_raci`

| Colonne                  | Description                         |
| ------------------------ | ----------------------------------- |
| `task_id` / `subtask_id` | Référence à la tâche / sous‑tâche.  |
| `user_uuid`              | Utilisateur concerné.               |
| `letter`                 | Rôle **R/A/C/I** unique par couple. |

#### Table `profile`

Liste des **profils utilisateurs finaux** (distincts des rôles projet internes). Représente les cibles du LMS MEDACAP.

| Colonne | Type          | Description                                                                                     |
| ------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `code`  | varchar(8) PK | Acronyme unique (ex: TEC=Technicien, MAN=Manager, DPS, DOP, DF, DG, RH, AF, SA).               |
| `name`  | varchar(64)   | Libellé lisible pour chaque profil utilisateur final (ex: "Technicien", "Manager", "RH", etc.). |

#### Table `task_profile`

Table de jonction n‑n **tâches ←→ profils impactés**.

#### Table `attachment`

Stockage double fichier (PNG aplati + JSON Fabric) lié à une tâche.

| Colonne      | Type          | Description                     |
| ------------ | ------------- | ------------------------------- |
| `id`         | serial PK     |                                 |
| `task_id`    | int FK `task` |                                 |
| `png_path`   | varchar(256)  | Chemin vers l'image compressée. |
| `json_path`  | varchar(256)  | Chemin du vecteur Fabric.       |
| `size_bytes` | int           | Garde‑fou < 2 Mo.               |

---

## 3. Modélisation physique – DDL PostgreSQL

```sql
-- ENUMS
-- Rôles projet internes (distincts des profils utilisateurs finaux)
CREATE TYPE role_code AS ENUM ('CP','RF','DEV','STG','UF');
CREATE TYPE phase_code AS ENUM ('M','E','D','A','C','A2','P');
CREATE TYPE raci_letter AS ENUM ('R','A','C','I');

-- TABLES PRINCIPALES
CREATE TABLE "user" (
  uuid            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    varchar(64)  NOT NULL,
  role            role_code    NOT NULL
);

CREATE TABLE session (
  sid          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uuid    uuid        NOT NULL REFERENCES "user"(uuid) ON DELETE CASCADE,
  role_active  role_code   NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);

CREATE TABLE device_user (
  client_id   uuid PRIMARY KEY,
  user_uuid   uuid NOT NULL REFERENCES "user"(uuid) ON DELETE CASCADE,
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_user_user ON device_user(user_uuid);

CREATE TABLE phase (
  code      phase_code PRIMARY KEY,
  name      varchar(32) NOT NULL,
  position  smallint    NOT NULL
);

CREATE TABLE page (
  id          serial PRIMARY KEY,
  phase_code  phase_code REFERENCES phase(code),
  title       varchar(128) NOT NULL,
  description text,
  UNIQUE (phase_code, title)
);

CREATE TABLE task (
  id          serial PRIMARY KEY,
  phase_code  phase_code REFERENCES phase(code),
  page_id     int REFERENCES page(id),
  title       varchar(256) NOT NULL,
  description text,
  priority    smallint NOT NULL CHECK (priority BETWEEN 1 AND 5),
  owner_uuid  uuid REFERENCES "user"(uuid),
  progress    numeric(5,2) NOT NULL DEFAULT 0,
  created_by  uuid NOT NULL REFERENCES "user"(uuid),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subtask (
  id       serial PRIMARY KEY,
  task_id  int NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  title    varchar(256) NOT NULL,
  done     boolean NOT NULL DEFAULT false
);

CREATE TABLE task_raci (
  task_id   int  REFERENCES task(id) ON DELETE CASCADE,
  user_uuid uuid REFERENCES "user"(uuid) ON DELETE CASCADE,
  letter    raci_letter NOT NULL,
  PRIMARY KEY (task_id, user_uuid)
);

CREATE TABLE subtask_raci (
  subtask_id int  REFERENCES subtask(id) ON DELETE CASCADE,
  user_uuid  uuid REFERENCES "user"(uuid) ON DELETE CASCADE,
  letter     raci_letter NOT NULL,
  PRIMARY KEY (subtask_id, user_uuid)
);

CREATE TABLE profile (
  code varchar(8) PRIMARY KEY,
  name varchar(64) NOT NULL
);

CREATE TABLE task_profile (
  task_id      int REFERENCES task(id) ON DELETE CASCADE,
  profile_code varchar(8) REFERENCES profile(code) ON DELETE CASCADE,
  PRIMARY KEY (task_id, profile_code)
);

CREATE TABLE attachment (
  id         serial PRIMARY KEY,
  task_id    int NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  png_path   varchar(256) NOT NULL,
  json_path  varchar(256) NOT NULL,
  size_bytes int NOT NULL CHECK (size_bytes <= 2048000)
);

-- INDEXES FULL‑TEXT
CREATE INDEX idx_task_fulltext ON task USING GIN (to_tsvector('french', coalesce(title,'') || ' ' || coalesce(description,'')));
CREATE INDEX idx_subtask_fulltext ON subtask USING GIN (to_tsvector('french', title));

-- TRIGGERS (updated_at + progress)
CREATE OR REPLACE FUNCTION trg_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER task_updated BEFORE UPDATE ON task FOR EACH ROW EXECUTE FUNCTION trg_updated_at();

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
CREATE TRIGGER subtask_progress AFTER INSERT OR UPDATE OF done ON subtask
  FOR EACH ROW EXECUTE FUNCTION fn_task_progress();
```

---

## 4. Scripts Knex – Migrations & Seed (extraits)

```ts
// 20250715_create_enums.ts
export async function up(knex) {
  // Rôles projet internes uniquement
  await knex.raw("CREATE TYPE role_code AS ENUM ('CP','RF','DEV','STG','UF')");
  await knex.raw("CREATE TYPE phase_code AS ENUM ('M','E','D','A','C','A2','P')");
  await knex.raw("CREATE TYPE raci_letter AS ENUM ('R','A','C','I')");
}
export async function down(knex) {
  await knex.raw('DROP TYPE raci_letter');
  await knex.raw('DROP TYPE phase_code');
  await knex.raw('DROP TYPE role_code');
}
```

*(Les fichiers suivants créent chaque table sur le même modèle, suivis d'un seeder initialisant 5 sessions, 7 phases, 10 pages.)*

---

## 5. Documentation DBML (exportable)

```dbml
Project MEDACAP {
  database_type: 'PostgreSQL'
}

Table "user" {
  uuid uuid [pk]
  display_name varchar(64)
  role role_code
}

Table session {
  sid uuid [pk]
  user_uuid uuid [ref: > user.uuid]
  role_active role_code
  created_at timestamptz
  expires_at timestamptz
}

Table device_user {
  client_id uuid [pk]
  user_uuid uuid [ref: > user.uuid]
  first_seen timestamptz
  last_seen timestamptz
}

Table phase {
  code phase_code [pk]
  name varchar(32)
  position smallint
}

Table page {
  id serial [pk]
  phase_code phase_code [ref: > phase.code]
  title varchar(128)
  description text
}

Table task {
  id serial [pk]
  phase_code phase_code [ref: > phase.code]
  page_id int [ref: > page.id]
  title varchar(256)
  description text
  priority smallint
  owner_uuid uuid [ref: > user.uuid]
  progress numeric
  created_by uuid [ref: > user.uuid]
  created_at timestamptz
  updated_at timestamptz
}

Table subtask {
  id serial [pk]
  task_id int [ref: > task.id]
  title varchar(256)
  done boolean
}

Table task_raci {
  task_id int [ref: > task.id]
  user_uuid uuid [ref: > user.uuid]
  letter raci_letter
  Indexes {
    (task_id, user_uuid) [pk]
  }
}

Table subtask_raci {
  subtask_id int [ref: > subtask.id]
  user_uuid uuid [ref: > user.uuid]
  letter raci_letter
  Indexes {
    (subtask_id, user_uuid) [pk]
  }
}

Table profile {
  code varchar(8) [pk]
  name varchar(64)
}

Table task_profile {
  task_id int [ref: > task.id]
  profile_code varchar(8) [ref: > profile.code]
  Indexes {
    (task_id, profile_code) [pk]
  }
}

Table attachment {
  id serial [pk]
  task_id int [ref: > task.id]
  png_path varchar(256)
  json_path varchar(256)
  size_bytes int
}
```

---

## 6. Justification & évolutivité

1. **Enum vs. Lookup** : les valeurs stables à faible cardinalité (roles, phases, raci) sont stockées en *ENUM* pour compacité et validation stricte. Les profils métier, plus évolutifs (TEC, MAN, …), reposent sur une table `profile` pour édition sans DDL.
2. **Triggers** : `updated_at` et `progress` automatisent la cohérence sans coût important, et sont facilement testables.
3. **Index full‑text** : améliore la recherche temps réel (`ILIKE` fallback) avec support PostgreSQL français.
4. **Conformité MVP** : modèle couvre 100 % des US *Must* (US‑01 à US‑18). Les nice‑to‑have (locks, metrics) pourront s'appuyer sur Redis ou tables supplémentaires (`dashboard_kpi`, `edit_lock`).
5. **Scalabilité** : conventions FK *ON DELETE CASCADE* garantissent nettoyage référentiel sans orphelins. Ajout de partitions par phase ou projet simple si multi‑projet.

---

## 7. Stratégie de journalisation & monitoring

| Aspect                | MVP (≤ 7 jours)                                                                                                                                                 | Post‑MVP (scalabilité)                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Logger applicatif** | **Pino** (JSON, ultra‑rapide) avec `pino-pretty` en dev. Tous les points d'entrée Fastify (routes, WS) logguent `req/res/time`.                                 | Ajout `pino-http` hooks + traces OpenTelemetry.                                              |
| **Destination**       | Fichiers journaliers dans `/var/log/medacap/api‑*.log` (rotation `1 j`, rétention 7 j via [`pino-rotating-file`](https://github.com/kibae/pino-rotating-file)). | Transport **Loki** via `@softwarebrother/pino-loki`, agrégation avec **Grafana** + alerting. |
| **Structure JSON**    | `{ ts, level, msg, reqId, path, method, status, durMs, user, phaseCode }`                                                                                       | + champs trace ID, mémoire, CPU, kubepod.                                                    |
| **Logs PostgreSQL**   | `log_destination = 'stderr'`, rotation journalière. Montés dans Docker volume puis consommés par **Promtail**.                                                  | Extension **pgAudit** pour audit DCL/DML, envoyée à Loki par Promtail label `component=db`.  |
| **Niveaux**           | `trace` en local, `info` prod, `warn` + `error` traités par Fastify errorHandler, `fatal` trigger restart Docker.                                               | Sentry pour stack‑trace front + back.                                                        |
| **Format dev**        | Colorisé (`pino-pretty`).                                                                                                                                       | JSON only.                                                                                   |
| **Retention**         | 7 jours (MVP).                                                                                                                                                  | 30 jours (chaud) + 90 jours (froid S3).                                                      |
| **Alerting**          | — (console/CLI).                                                                                                                                                | Grafana Alert (rule: `error rate > 5/min`).                                                  |
| **Événements clés**   | `login_name_mismatch` level=WARN + payload `{clientId,triedName,storedName}`                                                                                    | Alert Grafana (>0/10 min)                                                                    |

### 7.1 Snippets Docker Compose (extrait Loki + Promtail)

```yaml
dekart-loki:
  image: grafana/loki:2.9
  command: -config.file=/etc/loki/local-config.yaml
  volumes:
    - ./loki-config.yaml:/etc/loki/local-config.yaml
    - loki_data:/loki
  ports:
    - "3100:3100"

promtail:
  image: grafana/promtail:2.9
  volumes:
    - ./promtail-config.yaml:/etc/promtail/config.yaml
    - /var/log/medacap:/var/log/medacap:ro
    - db_logs:/var/log/postgresql:ro
  command: -config.file=/etc/promtail/config.yaml
```

```yaml
# promtail-config.yaml (MVP minimal)
server:
  http_listen_port: 9080
positions:
  filename: /tmp/positions.yaml
clients:
  - url: http://dekart-loki:3100/loki/api/v1/push
scrape_configs:
  - job_name: api
    static_configs:
      - targets: ["localhost"]
        labels:
          component: api
          __path__: /var/log/medacap/*.log
  - job_name: db
    static_configs:
      - targets: ["localhost"]
        labels:
          component: db
          __path__: /var/log/postgresql/postgresql-*.log
```

> **Pourquoi Loki ?** Léger (single binary, index time‑series), facile à déployer via Docker, parfait pour < 20 utilisateurs simultanés et extensible horizontalement. Compatible Grafana déjà utilisé pour métriques.

---

## 8. Tests d'intégration clés

| Scénario                               | Résultat attendu                                        |
| -------------------------------------- | ------------------------------------------------------- |
| 1. Login initial « Dev » (sans cookie) | 200 OK, cookie `client_id` défini, INSERT `device_user` |
| 2. Login même nom + cookie             | 200 OK, UPDATE `last_seen`                              |
| 3. Login nom différent + cookie        | 403, log WARN `login_name_mismatch`                     |

---

## 9. Étapes suivantes

1. **Endpoint unlock** : `DELETE /admin/device-user/:clientId` ("ADMIN\_PASSWORD" header).
2. **Doc OpenAPI** : ajouter schémas `DeviceUser`, codes 403.
3. **Seeders** : pas de seed pour `device_user`, ajouter seed pour les profils utilisateurs finaux (TEC, MAN, DPS, etc.).
4. **CI/CD** : ajouter job de test `auth.routes.test.ts`.
5. **Audit sécurité** : évaluation RLS si multi‑tenant.
6. **Tests unitaires** : générer factories avec \[faker.js] et \[jest‑fixtures] pour `user`, `task`, etc.
7. **Revue sécurité** : vérifier indexes sur `owner_uuid` vs. RLS si multi‑tenant.
8. **CI/CD** : intégrer `npm run db:migrate:test` pour pipeline.

---

## 10. Clarification des rôles vs profils

### 10.1 Deux catégories distinctes

| Catégorie                    | Stockage                           | Utilisation                                             |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------- |
| **Rôles projet internes**    | Enum `role_code` dans table `user` | Définit qui travaille sur le projet et leurs permissions |
| **Profils utilisateurs finaux** | Table `profile` avec `code` et `name` | Représente les cibles du LMS MEDACAP (qui sera impacté) |

### 10.2 Rôles projet internes (travaillent sur le projet)

- **CP** : Chef de Projet
- **RF** : Responsable Formation
- **DEV** : Développeur
- **STG** : Stagiaire
- **UF** : Utilisateur Final (testeur)

### 10.3 Profils utilisateurs finaux (cibles du LMS)

- **TEC** : Technicien
- **MAN** : Manager
- **DPS** : Délégué à la Protection des Sites
- **DOP** : Directeur Opérationnel de Production
- **DF** : Directeur Filiale
- **DG** : Directeur Groupe
- **RH** : Ressources Humaines
- **AF** : Administrateur Filiale
- **SA** : Super Administrateur

Cette distinction est essentielle pour comprendre qui travaille sur le projet (rôles) versus qui sera impacté par les tâches (profils).

*Document prêt à être importé dans l'outil de génération ORM (Prisma, Sequelize, TypeORM, SQLAlchemy).*