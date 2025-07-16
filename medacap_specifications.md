# Expression de besoin – MEDACAP Project Manager (MVP 7 jours)

*Version 1.1 – 15 juillet 2025*

## 1. Contexte et objectif

Le centre de formation souhaite disposer, sous 7 jours ouvrés, d'un **gestionnaire de projet interne** dédié au pilotage du futur LMS « MEDACAP ». L'application doit :

* accélérer la coordination entre les intervenants ;
* offrir une vue Kanban calée sur les 7 phases MEDACAP ;
* rester légère (stack moderne mais minimale) et déployable en réseau local ou via reverse‑proxy.

## 2. Portée fonctionnelle du MVP

### 2.1 Liste détaillée des besoins fonctionnels

1. **Authentification minimaliste**

   * Écran d'accueil avec champ « Nom » et liste déroulante « Rôle ».
   * Validation ⇒ création d'une session (cookie HTTP‑only).
   * Changement de rôle via bouton dédié (mot de passe ADMIN requis).

2. **Référentiels fixes**

   * Chargement des **7 phases MEDACAP** dans l'ordre M, E, D, A, C, A₂, P.
   * Gestion d'un catalogue de **pages fonctionnelles** rattachées à une phase (CRUD Page limité à CP).

3. **Vues de suivi synchronisées**

   * **Kanban MEDACAP** : 7 colonnes (une par phase) avec drag & drop (met à jour `phaseCode`).
   * **Liste / Backlog** : tableau filtrable et recherchable (phase, page, owner, texte).
   * **Tableau par profil impacté** : swimlanes = profils finaux, colonnes = statuts (M/E/D/A/C/A₂/P).
   * **Timeline / Gantt simplifié** : barres de tâches sur axe temporel, redimension et déplacement.
   * **Calendrier** : vue mois/semaine avec re‑planification par glisser‑déposer.
   * *(Nice‑to‑have)* **Dashboard métriques** : burndown, KPIs agrégés et tableur éditable.

4. **Gestion des tâches**

   * Création d'une tâche : titre, description, phase, page, owner (obligatoire), priorité P1‑P5, profils impactés (0‑n), RACI, pièce jointe optionnelle.
   * Modification et suppression par rôle autorisé.
   * Progression auto calculée (% moyen des sous‑tâches).

5. **Sous‑tâches**

   * Ajout, édition, suppression d'items ✅/❌.
   * Duplication du RACI de la tâche puis édition indépendante.
   * Mise à jour du pourcentage parent lorsque cochées.

6. **RACI**

   * Attribution d'un seul rôle R, A, C ou I par `(taskId,userId)`.
   * Interface d'édition au niveau tâche et sous‑tâche.

7. **Filtrage & recherche**

   * Filtres par phase, page, owner, texte libre.
   * Recherche temps réel dans titre/description.

8. **Capture & annotation**

   * Upload ou drag‑drop PNG/JPG (≤ 2 Mo).
   * Édition Fabric.js : surligner, encadrer, flèches, texte, undo/redo, zoom.
   * Double stockage : PNG aplati + JSON vecteurs pour ré‑édition.

9. **Collaboration temps réel**

   * Diffusion < 500 ms des créations, déplacements, mises à jour via Socket.io.
   * Reconnect auto (5 tentatives) puis fallback polling 10 s.
   * Scope limité à la "room" `project:MEDACAP`.

10. **Export Excel (read‑only)**

    * Bouton « Export » générant `.xlsx` avec colonnes fixes, merges Phase/Profil et formules `%`.

11. **Seeder & administration minimale**

    * Script `npm run seed` créant 5 rôles de test, 7 phases, 10 pages.
    * CRUD Page (création page LMS) réservé au CP.

12. **Verrouillage soft (Nice‑to‑have)**

    * Affichage d'un badge « en cours d'édition » si la fiche est déjà ouverte.

### 2.2 Synthèse EPIC ↔ User Stories (MoSCoW)

| EPIC                 | US *Must* (incluses)                                          | US *Should/Could* (facultatives si temps) |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| A – Authentification | US‑01 Login/choix rôle, US‑02 Logout                          | —                                         |
| B – Référentiels     | US‑03 Phases, US‑04 Pages                                     | —                                         |
| C – Tâches           | US‑05 Créer, US‑06 Drag & drop, US‑07 Sous‑tâche, US‑08 Coche | US‑09 RACI, US‑10 Filtre                  |
| D – Annotation       | US‑11 Upload+annoter, US‑12 Viewer                            | US‑13 Ré‑annoter                          |
| E – Export           | US‑14 Excel                                                   | US‑15 Burndown                            |
| F – Temps réel       | US‑16 Live updates                                            | US‑17 Lock soft                           |
| G – Administration   | US‑18 Seeder, US‑19 Ajouter page                              | —                                         |

> **Note :** seules les US *Must* sont **obligatoires** pour la livraison MVP en 7 jours ; les *Should/Could* seront intégrées si le planning réel le permet.

## 3. Acteurs, rôles et sessions, rôles et sessions

### 3.1 Rôles projet internes (MVP)

* Chef de projet (**CP**) : pilote le projet, priorise le backlog.
* Responsable formation (**RF**) : définit les contenus / pages pédagogiques, s'assure de la cohérence métier.
* Développeuse full‑stack (**DEV**) : implémente les fonctionnalités, corrige les anomalies.
* Stagiaire développeur (**STG**) : prend en charge des sous‑tâches ciblées, sous la supervision DEV.
* Utilisateur final (**UF**) : valide la conformité fonctionnelle depuis le point de vue apprenant/exploitant.

### 3.2 Profils utilisateurs finaux

* **Technicien (TEC)** : suit les procédures techniques, relève les anomalies sur le terrain.
* **Manager (MAN)** : consulte l'avancement de ses équipes, valide les demandes de formation.
* **DPS** (Directeur Pièces et Services) : supervise la conformité sûreté, contrôle les tâches liées aux protocoles sécurité.
* **DOP** (Directeur des Opérations) : suit la performance opérationnelle globale, arbitre les priorités critiques.
* **Directeur Filiale (DF)** : dispose d'une vision 360° de la filiale, approuve les jalons majeurs.
* **Directeur Groupe (DG)** : vision transverse groupe, observe les indicateurs stratégiques multi‑filiales.
* **RH** : valide l'éligibilité aux formations, gère les profils impactés dans les tâches.
* **Administrateur Filiale (AF)** : administre les habilitations locales, peut ajouter des pages spécifiques.
* **Super Administrateur (SA)** : rôle technique ultime, paramètre l'application, supervise les sauvegardes.

### 3.3 Flux d'authentification minimaliste

1. **Écran d'accueil** : champ libre « Nom » + liste déroulante « Rôle ».
2. L'utilisateur valide → création d'une **session Nom + Rôle** (exclusifs). Aucun e‑mail ni mot de passe.
3. **Changement de rôle** : bouton « Changer de rôle » ⇒ la session est détruite puis le système demande le **mot de passe ADMIN** (stocké serveur, variable ENV). Si OK, retour à l'écran d'accueil.

### 3.4 Sécurité minimale

* Cookie de session HTTP‑only.
* Trafic chiffré assuré par reverse‑proxy SSL.
* Pas de comptes persistants ni de gestion de mots de passe individuels.

## 4. Règles de gestion détaillées

### 4.1 Modèle RACI

| Règle              | Décision                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Unicité            | Une combinaison `(taskId, userId)` ne peut porter qu'**une** lettre parmi **R / A / C / I**.                   |
| Tâche → sous‑tâche | Lors de la création d'une sous‑tâche, le RACI de la tâche est **dupliqué** puis **modifiable** indépendamment. |

### 4.2 Tâches & sous‑tâches

* **Flux ticketing** : lorsqu'une tâche est créée, elle est placée dans la **vue Backlog** sans propriétaire. Un **DEV** peut cliquer « Prendre » pour s'auto‑assigner ou « Assigner au STG » pour la passer au stagiaire. Le champ **owner** devient obligatoire uniquement à cette étape d'assignation.
* **Tâche** : phase MEDACAP, page cible, titre, description, priorité P1–P5, progression auto (moyenne % sous‑tâches), pièces jointes, profils impactés (obligatoire si la tâche modifie une page), RACI, owner (renseigné lors de l'assignation DEV/STG).
* **Sous‑tâche** : intitulé, état ✅/❌, RACI propre.

### 4.3 Capture & annotation

| Aspect          | Décision                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Double stockage | 1. **PNG aplati** (affichage rapide)  2. **JSON Fabric.js** (vecteurs) pour ré‑édition. Fichiers : `capture_<id>.png` + `capture_<id>.json`. |
| Limite taille   | 2 Mo post‑compression (≈ 1920×1080). Front redimensionne en amont. Backend refuse > 2 Mo (valeur paramétrable via `.env`).                   |

### 4.4 Temps réel

| Sujet           | Décision                                                  |
| --------------- | --------------------------------------------------------- |
| Lib             | **Socket.io** (WS, fallback auto intégré).                |
| Reconnect       | 5 tentatives ⇒ bascule en HTTP polling (10 s).            |
| Scope broadcast | **Room `project:MEDACAP`** (évolutif multi‑projet).       |
| SLA             | Diffusion < 500 ms entre l'action et la réception client. |

### 4.5 Export Excel

* Export **read‑only** : pas de ré‑import prévu au MVP.
* Colonnes : Phase ▸ Profil créateur ▸ Page ▸ **Profils impactés** ▸ Tâche ▸ Owner ▸ Priorité ▸ Progress % ▸ RACI.
* Fusion de cellules Phase/Profil, formules pour le %..

## 5. Contraintes non fonctionnelles

| Critère              | Valeur                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Temps de réponse UI  | < 500 ms pour les opérations CRUD courantes                            |
| Concurrence cible    | ≤ 20 utilisateurs simultanés (pouvant monter à 100 en pico)            |
| Stockage local       | `/uploads` monté sur le serveur, sauvegardé via script `cp -r uploads` |
| Sauvegarde BDD       | `pg_dump` planifié (cron) + copie des fichiers                         |
| Internationalisation | Français uniquement (MVP)                                              |

## 6. Stack technique (proposition à valider)

* **Backend** : Node.js + Fastify ou NestJS, DB PostgreSQL, Socket.io.
* **Frontend** : React + Vite + Zustand, Fabric.js pour le canvas d'annotation, TailwindCSS.
* **Déploiement** : Docker Compose (API, DB, reverse‑proxy Caddy).

## 7. Jeu de données de démonstration

`npm run seed` (alias `knex seed:run`) créé :

* 5 sessions prêtes (CP, RF, DEV, STG, UF).
* 7 phases MEDACAP + 10 pages exemple.

## 8. Glossaire

| Terme       | Définition                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **MEDACAP** | Cycle qualité interne : Mesurer, Exploiter, Définir, Acquérir, Certifier, Appliquer, Performer. |
| **RACI**    | Matrix Responsible/Accountable/Consulted/Informed.                                              |
| **MVP**     | Version livrable en 7 jours, focale sur valeur immédiate.                                       |

## 9. Questions ouvertes restantes

1. Validation de la **stack technique** proposée ?
2. Taille exacte de l'**équipe de dev** allouée (capacités SP réelles) ?
3. Pré‑existence d'un **serveur Caddy/Nginx reverse‑proxy** dans l'infra ?
4. Besoin d'un **plan de tests** formalisé (scénarios + jeux de données) avant démarrage ?

---

*Merci de relire, commenter ou compléter les points ci‑dessus afin de passer à l'élaboration de l'EdBT (schéma ER, API, diagrammes de séquence, etc.).*

# Expression de besoin **technique** (EdBT) – MEDACAP Project Manager

*Version 1.0 – 15 juillet 2025*

---

## 1. Architecture cible

| Couche                  | Technologie                                              | Rôle                                  |
| ----------------------- | -------------------------------------------------------- | ------------------------------------- |
| **Frontend**            | React 18 + Vite, Zustand (state), TailwindCSS, Fabric.js | UI, Canvas annotation, WS client      |
| **Backend API**         | Node.js 20 + Fastify (LightMyServer), TypeScript         | REST/WS, auth session, business logic |
| **WebSocket**           | Socket.io v5 (Fastify adapter)                           | Live updates & locks                  |
| **DB**                  | PostgreSQL 15                                            | Stockage persistant                   |
| **Cache** *(optionnel)* | Redis                                                    | Lock soft + pub/sub multi‑instance    |
| **Reverse‑proxy**       | Caddy v2 (HTTPS auto)                                    | TLS, compression, static assets       |
| **CI/CD**               | GitHub Actions → Docker Hub → Portainer                  | Build, test, déploiement              |

### 1.1 Diagramme de déploiement (texte)

* **Client** ⇄ HTTPS ⇄ **Caddy** ⇄ Fastify API (port 4000) ⇄ PostgreSQL (port 5432) & Redis (port 6379)
* Socket.io WS multiplexé sous `/socket.io` (upgrade par Caddy).

---

## 2. Modèle de données (ER simplifié)

```mermaid
erDiagram
    USER ||--|{ SESSION : "opens"
    USER {
        uuid PK
        display_name varchar
        role enum(CP,RF,DEV,STG,UF,TEC,MAN,DPS,DOP,DF,DG,RH,AF,SA)
    }
    SESSION {
        sid PK
        user_uuid FK
        role_active enum
        created_at timestamp
        expires_at timestamp
    }
    PHASE ||--|{ PAGE : "includes"
    PHASE {
        code PK char(1)
        name varchar
        position smallint
    }
    PAGE {
        id PK
        phase_code FK
        title varchar
        description text
    }
    TASK ||--|{ SUBTASK : "contains"
    TASK ||--|{ TASK_RACI : "has"
    TASK ||--|{ TASK_PROFILE : "impacts"
    TASK {
        id PK
        phase_code FK
        page_id FK
        title varchar
        description text
        priority int
        owner_uuid FK nullable
        progress numeric default 0
        created_by FK USER
        created_at timestamp
        updated_at timestamp
    }
    SUBTASK ||--|{ SUBTASK_RACI : "has"
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

---

## 3. API REST (Fastify)

| Méthode    | Route                    | Auth          | Payload / Params      | Réponse          |
| ---------- | ------------------------ | ------------- | --------------------- | ---------------- |
| **POST**   | `/sessions`              | —             | `{name, role}`        | `{sid}` (cookie) |
| **DELETE** | `/sessions/:sid`         | Cookie        | —                     | `204`            |
| **GET**    | `/phases`                | Pub           | —                     | `[Phase]`        |
| **GET**    | `/pages?phase=M`         | Pub           | `phase` filtre        | `[Page]`         |
| **POST**   | `/tasks`                 | CP/RF/DEV/STG | `TaskInput`           | `Task`           |
| **PATCH**  | `/tasks/:id`             | Owner+        | champs partiels       | `Task`           |
| **POST**   | `/tasks/:id/subtasks`    | DEV/STG       | `SubTaskInput`        | `SubTask`        |
| **PATCH**  | `/subtasks/:id`          | R/W           | `{done}`              | `SubTask`        |
| **POST**   | `/tasks/:id/attachments` | R/W           | `multipart/form-data` | `Attachment`     |
| **GET**    | `/export`                | CP/RF         | queryFiltres          | `.xlsx` stream   |

*Le schéma JSON détaillé des payloads est fourni en annexe A.*

### 3.1 Validation (Zod)

Tous les DTO sont validés server‑side (Zod schemas) puis sérialisés via `fastify‐type‐provider‐zod` pour TS‑inference côté front.

---

## 4. WebSocket (Socket.io)

| Event            | Émit par                 | Data             | Broadcasting           |
| ---------------- | ------------------------ | ---------------- | ---------------------- |
| `task:new`       | API après POST `/tasks`  | `Task`           | room `project:MEDACAP` |
| `task:update`    | API après PATCH          | `Task`           | room                   |
| `subtask:update` | API                      | `SubTask`        | room                   |
| `lock:set`       | Client ouvrant une fiche | `{taskId, user}` | room                   |
| `lock:release`   | Client quittant          | `{taskId}`       | room                   |

---

## 5. Modules Backend

1. **AuthModule** : création/validation de session, middleware rôle.
2. **TaskModule** : routes tâche + service RACI/Progress.
3. **AttachmentModule** : upload, redimension (Sharp), stockage disque `/uploads`.
4. **WSModule** : gateway Socket.io + gestion rooms.
5. **ExportModule** : génération Excel (ExcelJS) stream.
6. **SeedModule** : scripts Knex seeding & fixtures.

---

## 6. Seed & migrations

* **Knex** : migrations versionnées (`phases`, `pages`, `users_demo`, etc.).
* Commandes : `npm run db:migrate`, `npm run seed`.

---

## 7. Environnements & déploiement

| Variable           | Exemple DEV                              | Description                     |
| ------------------ | ---------------------------------------- | ------------------------------- |
| `ADMIN_PASSWORD`   | `medacap2025!`                           | Mot de passe changement de rôle |
| `UPLOAD_DIR`       | `/app/uploads`                           | Stockage pièces jointes         |
| `WS_FALLBACK_POLL` | `10`                                     | sec                             |
| `DB_URL`           | `postgres://medacap:pwd@db:5432/medacap` | Connexion BDD                   |

### 7.1 Docker Compose (extrait)

```yaml
services:
  api:
    build: ./backend
    env_file: .env
    volumes:
      - uploads:/app/uploads
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: medacap
      POSTGRES_PASSWORD: pwd
  caddy:
    image: caddy:2
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
volumes:
  uploads:
```

---

## 8. Non‑fonctionnel

* **Perf** : 95ᵉ percentile < 500 ms sur `/tasks` liste 50 items.
* **Logs** : Pino + pino‑pretty DEV ; agrégation Loki/Grafana.
* **Tests** : Jest (unit), Supertest (API), Cypress (e2e) ; seuil couverture 80 %.
* **Sécurité** : Helmet, rate‑limit 100 req/min/IP.

---

## 9. Roadmap technique post‑MVP *(indicatif)*

1. Auth SSO / JWT.
2. Multi‑projet (rooms dynamiques, clé `projectId`).
3. Import Excel bidirectionnel.
4. Internationalisation (i18n React‑Intl).

---

### Annexe A – JSON Schemas (extraits)

```jsonc
// TaskInput
{
  "phaseCode": "D",
  "pageId": 7,
  "title": "Intégrer endpoint /login",
  "description": "\u2026",
  "priority": 2,
  "profilesImpacted": ["TEC", "MAN"],
  "raci": [{"userUuid":"…","letter":"R"}]
}
```

*Les autres schémas suivent le même principe, fournis dans le dépôt.*

---

*Merci de relire et de pointer les éventuelles lacunes avant lancement du sprint.*

## 10. Décisions anti‑sur‑ingénierie (MVP ≤ 7 jours)

| Sujet                | Choix MVP (implémenté)                                                              | Report post‑MVP                                      |
| -------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Versioning API**   | Pas de `/v1/` : routes internes, une seule version.                                 | Tagging semver + prefix `/v2/` si breaking change.   |
| **Pagination & tri** | Liste `/tasks` limitée à 50 (hard‑limit). Pas de tri paramétrable.                  | Query `page` & `sort` avec index DB.                 |
| **Format d'erreur**  | `{ error: "message" }` simple.                                                      | RFC 7807 / JSON\:API.                                |
| **CSRF**             | `SameSite=strict` + vérif `Origin` ; pas de token double‑submit.                    | Token CSRF si cookie laxisé.                         |
| **Row‑locking**      | Optimiste via `updatedAt` : si modif concurrente ⇒ 409.                             | Advisory locks Postgres.                             |
| **Observabilité**    | Pino → fichiers journaliers (rotation 7 j).                                         | Loki/Grafana + traces.                               |
| **CI/CD**            | Job GitHub Actions `lint → test → docker build/push`. Déploiement manuel Portainer. | CD auto + secrets OIDC.                              |
| **Backups**          | Cron quotidien `pg_dump` + `tar uploads` (retenu 7 jours).                          | Retention 4 semaines + 3 mois + restore script auto. |
| **Scalabilité**      | Single instance API + WS (stickiness Caddy).                                        | Redis adapter + réplica.                             |
| **Tests**            | Unit Jest + smoke Cypress (auth + créer tâche).                                     | Suite e2e complète + tests charge k6.                |

---

*EdBT gelé pour le MVP : seules les décisions du tableau ci‑dessus seront livrées.*