// ========================================
// GymFlow - SQLite Database Layer
// ========================================

import * as SQLite from 'expo-sqlite';
import type {
  UUID,
  WorkoutTemplate,
  TemplateExercise,
  WorkoutSession,
  SessionExercise,
  CompletedSet,
  WorkoutSnapshot,
  SyncQueueItem,
  UserProfile,
  WorkoutDomainEvent,
} from '../types';
import type { GymFlowStore } from './types';
import type { Gym } from '../modules/gym';
import type { Equipment } from '../modules/equipment';
import type { GymEquipmentInventoryItem } from '../modules/gym-inventory';
import type { ExerciseMaster } from '../modules/exercise';
import { exerciseSeeds } from '../modules/exercise/seed';
import type { MovementFamily } from '../modules/movement-family';
import { movementFamilyAssignments, movementFamilySeeds } from '../modules/movement-family/seed';
import type { EquipmentRequirement, ExerciseMovementFamily, RequirementGroup } from '../modules/exercise-equipment';
import { equipmentRequirementSeeds, requirementGroupSeeds } from '../modules/exercise-equipment/seed';

// --- Database Singleton ---
let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('gymflow.db');
  await initializeDatabase(db);
  return db;
}

// --- Schema ---
const SCHEMA_VERSION = 1;

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');

    -- User profile (local cache)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      created_at INTEGER NOT NULL
    );

    -- Workout templates (plans)
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      snapshot TEXT NOT NULL, -- JSON: full template data
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Workout sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      template_id TEXT,
      template_name TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      completed_at INTEGER,
      duration INTEGER,
      paused_duration INTEGER DEFAULT 0,
      paused_at INTEGER,
      total_volume REAL DEFAULT 0,
      snapshot TEXT, -- JSON: final snapshot when completed
      pending_sync INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
    );

    -- Session exercises
    CREATE TABLE IF NOT EXISTS session_exercises (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_order INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- Completed sets
    CREATE TABLE IF NOT EXISTS completed_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_exercise_id TEXT NOT NULL,
      set_index INTEGER NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (session_exercise_id) REFERENCES session_exercises(id) ON DELETE CASCADE
    );

    -- Sync queue
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_attempt INTEGER,
      error TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS domain_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gyms (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, branch_name TEXT, address TEXT,
      latitude REAL, longitude REAL, external_provider TEXT, external_place_id TEXT,
      status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT,
      aliases_json TEXT NOT NULL DEFAULT '[]', archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gym_equipment (
      id TEXT PRIMARY KEY, gym_id TEXT NOT NULL, equipment_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity >= 1), area TEXT, notes TEXT,
      status TEXT NOT NULL DEFAULT 'available', verified INTEGER NOT NULL DEFAULT 0, capabilities_json TEXT,
      verified_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE RESTRICT,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
      UNIQUE(gym_id, equipment_id)
    );
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, aliases_json TEXT NOT NULL DEFAULT '[]',
      category TEXT NOT NULL, movement_pattern TEXT NOT NULL, primary_muscles_json TEXT NOT NULL,
      secondary_muscles_json TEXT NOT NULL, description TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS movement_families (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, aliases_json TEXT NOT NULL DEFAULT '[]',
      primary_muscles_json TEXT NOT NULL, secondary_muscles_json TEXT NOT NULL,
      category TEXT, description TEXT, status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exercise_movement_families (
      id TEXT PRIMARY KEY, exercise_id TEXT NOT NULL, movement_family_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('primary', 'secondary')), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
      FOREIGN KEY (movement_family_id) REFERENCES movement_families(id) ON DELETE RESTRICT,
      UNIQUE(exercise_id, movement_family_id)
    );
    CREATE TABLE IF NOT EXISTS exercise_requirement_groups (
      id TEXT PRIMARY KEY, exercise_id TEXT NOT NULL, name TEXT, priority INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS exercise_equipment_requirements (
      id TEXT PRIMARY KEY, requirement_group_id TEXT NOT NULL, equipment_id TEXT NOT NULL,
      requirement_level TEXT NOT NULL CHECK(requirement_level IN ('required', 'preferred', 'optional')),
      notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      FOREIGN KEY (requirement_group_id) REFERENCES exercise_requirement_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
      UNIQUE(requirement_group_id, equipment_id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_pending_sync ON sessions(pending_sync);
    CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_domain_events_entity ON domain_events(entity_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_gym_equipment_gym ON gym_equipment(gym_id);
    CREATE INDEX IF NOT EXISTS idx_gym_equipment_equipment ON gym_equipment(equipment_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_movement_families_exercise ON exercise_movement_families(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_movement_families_family ON exercise_movement_families(movement_family_id);
    CREATE INDEX IF NOT EXISTS idx_requirement_groups_exercise ON exercise_requirement_groups(exercise_id, priority);
    CREATE INDEX IF NOT EXISTS idx_equipment_requirements_group ON exercise_equipment_requirements(requirement_group_id);
  `);

  for (const item of exerciseSeeds) {
    await database.runAsync('INSERT OR IGNORE INTO exercises (id,name,aliases_json,category,movement_pattern,primary_muscles_json,secondary_muscles_json,description,notes,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [item.id,item.name,JSON.stringify(item.aliases),item.category,item.movementPattern,JSON.stringify(item.primaryMuscles),JSON.stringify(item.secondaryMuscles),item.description ?? null,item.notes ?? null,item.status,item.createdAt,item.updatedAt]);
  }
  for (const item of movementFamilySeeds) {
    await database.runAsync('INSERT OR IGNORE INTO movement_families (id,name,aliases_json,primary_muscles_json,secondary_muscles_json,category,description,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [item.id,item.name,JSON.stringify(item.aliases),JSON.stringify(item.primaryMuscles),JSON.stringify(item.secondaryMuscles),item.category ?? null,item.description ?? null,item.status,item.createdAt,item.updatedAt]);
  }
  for (const [exerciseId, movementFamilyId, role] of movementFamilyAssignments) {
    await database.runAsync('INSERT OR IGNORE INTO exercise_movement_families (id,exercise_id,movement_family_id,role,created_at,updated_at) VALUES (?,?,?,?,?,?)', [`seed-family-${exerciseId}-${movementFamilyId}`,exerciseId,movementFamilyId,role,Date.now(),Date.now()]);
  }
  const nativeEquipmentSeeds: Array<[string, string, string]> = [
    ['web-equipment-1','Barbell','free_weight'],['web-equipment-2','Dumbbell','free_weight'],['web-equipment-3','Flat Bench','free_weight'],['web-equipment-4','Adjustable Bench','free_weight'],['web-equipment-5','Power Rack','rack'],['web-equipment-6','Squat Rack','rack'],['web-equipment-7','Smith Machine','rack'],['web-equipment-8','Hack Squat','machine'],['web-equipment-9','Leg Press','machine'],['web-equipment-10','Leg Extension','machine'],['web-equipment-11','Leg Curl','machine'],['web-equipment-12','Hip Abductor','machine'],['web-equipment-13','Hip Adductor','machine'],['web-equipment-14','Calf Raise','machine'],['web-equipment-15','Chest Press','machine'],['web-equipment-16','Incline Chest Press','machine'],['web-equipment-17','Pec Deck','machine'],['web-equipment-18','Shoulder Press','machine'],['web-equipment-19','Lat Pulldown','cable'],['web-equipment-20','Seated Row','machine'],['web-equipment-21','Cable Station','cable'],['web-equipment-22','Functional Trainer','cable']
  ];
  for (const [id, name, category] of nativeEquipmentSeeds) await database.runAsync('INSERT OR IGNORE INTO equipment (id,name,category,aliases_json,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', [id,name,category,'[]',0,Date.now(),Date.now()]);
  for (const item of requirementGroupSeeds) await database.runAsync('INSERT OR IGNORE INTO exercise_requirement_groups (id,exercise_id,name,priority,created_at,updated_at) VALUES (?,?,?,?,?,?)', [item.id,item.exerciseId,item.name ?? null,item.priority,item.createdAt,item.updatedAt]);
  for (const item of equipmentRequirementSeeds) await database.runAsync('INSERT OR IGNORE INTO exercise_equipment_requirements (id,requirement_group_id,equipment_id,requirement_level,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', [item.id,item.requirementGroupId,item.equipmentId,item.level,item.notes ?? null,item.createdAt,item.updatedAt]);

  const sessionColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(sessions)');
  const columnNames = new Set(sessionColumns.map(column => column.name));
  if (!columnNames.has('paused_at')) await database.execAsync('ALTER TABLE sessions ADD COLUMN paused_at INTEGER');
  if (!columnNames.has('completed_at')) await database.execAsync('ALTER TABLE sessions ADD COLUMN completed_at INTEGER');
  const inventoryColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(gym_equipment)');
  if (!new Set(inventoryColumns.map(column => column.name)).has('capabilities_json')) await database.execAsync("ALTER TABLE gym_equipment ADD COLUMN capabilities_json TEXT");
}

// ========================================
// Template CRUD
// ========================================

export async function createTemplate(template: WorkoutTemplate): Promise<void> {
  const database = await getDatabase();
  const snapshot = JSON.stringify(template);

  await database.runAsync(
    `INSERT OR REPLACE INTO templates (id, name, description, snapshot, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [template.id, template.name, template.description || '', snapshot, template.createdAt, template.updatedAt]
  );
}

export async function updateTemplate(template: WorkoutTemplate): Promise<void> {
  const database = await getDatabase();
  const snapshot = JSON.stringify(template);

  await database.runAsync(
    `UPDATE templates SET name = ?, description = ?, snapshot = ?, updated_at = ? WHERE id = ?`,
    [template.name, template.description || '', snapshot, template.updatedAt, template.id]
  );
}

export async function deleteTemplate(id: UUID): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM templates WHERE id = ?', [id]);
}

export async function getTemplate(id: UUID): Promise<WorkoutTemplate | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ snapshot: string }>(
    'SELECT snapshot FROM templates WHERE id = ?',
    [id]
  );
  return row ? JSON.parse(row.snapshot) : null;
}

export async function getAllTemplates(): Promise<WorkoutTemplate[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ snapshot: string }>(
    'SELECT snapshot FROM templates ORDER BY updated_at DESC'
  );
  return rows.map(r => JSON.parse(r.snapshot));
}

// ========================================
// Session CRUD
// ========================================

export async function createSession(session: WorkoutSession): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO sessions (id, template_id, template_name, status, started_at, finished_at, completed_at, paused_at, duration, paused_duration, total_volume, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.templateId,
      session.templateName || null,
      session.status,
      session.startedAt,
      session.finishedAt || null,
      session.completedAt || null,
      session.pausedAt || null,
      session.duration || null,
      session.pausedDuration || 0,
      session.totalVolume || 0,
      now,
      now,
    ]
  );

  // Insert exercises and sets
  for (const exercise of session.exercises) {
    await database.runAsync(
      `INSERT INTO session_exercises (id, session_id, exercise_id, exercise_order, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [exercise.id, session.id, exercise.exerciseId, exercise.order, exercise.notes || null]
    );

    for (const set of exercise.sets) {
      await database.runAsync(
        `INSERT INTO completed_sets (session_exercise_id, set_index, weight, reps, completed)
         VALUES (?, ?, ?, ?, ?)`,
        [exercise.id, set.setIndex, set.weight, set.reps, set.completed ? 1 : 0]
      );
    }
  }
}

export async function updateSessionStatus(
  id: UUID,
  status: WorkoutSession['status'],
  extra?: Partial<Pick<WorkoutSession, 'pausedAt' | 'completedAt' | 'finishedAt' | 'duration' | 'totalVolume' | 'pausedDuration'>>
): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();

  const sets: string[] = ['status = ?', 'updated_at = ?'];
  const params: any[] = [status, now];

  if (extra?.finishedAt) {
    sets.push('finished_at = ?');
    params.push(extra.finishedAt);
  }
  if (extra?.completedAt !== undefined) { sets.push('completed_at = ?'); params.push(extra.completedAt); }
  if (extra && Object.prototype.hasOwnProperty.call(extra, 'pausedAt')) { sets.push('paused_at = ?'); params.push(extra.pausedAt ?? null); }
  if (extra?.duration !== undefined) {
    sets.push('duration = ?');
    params.push(extra.duration);
  }
  if (extra?.totalVolume !== undefined) {
    sets.push('total_volume = ?');
    params.push(extra.totalVolume);
  }
  if (extra?.pausedDuration !== undefined) {
    sets.push('paused_duration = ?');
    params.push(extra.pausedDuration);
  }

  params.push(id);
  await database.runAsync(
    `UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`,
    params
  );
}

// Update a single set within a session
export async function updateSet(
  exerciseId: UUID,
  setIndex: number,
  data: { weight?: number; reps?: number; completed?: boolean }
): Promise<void> {
  const database = await getDatabase();

  // Check if set exists
  const existing = await database.getFirstAsync<{ id: number }>(
    `SELECT cs.id FROM completed_sets cs
     JOIN session_exercises se ON se.id = cs.session_exercise_id
     WHERE se.id = ? AND cs.set_index = ?`,
    [exerciseId, setIndex]
  );

  if (existing) {
    const updates: string[] = [];
    const params: any[] = [];
    if (data.weight !== undefined) { updates.push('weight = ?'); params.push(data.weight); }
    if (data.reps !== undefined) { updates.push('reps = ?'); params.push(data.reps); }
    if (data.completed !== undefined) { updates.push('completed = ?'); params.push(data.completed ? 1 : 0); }
    params.push(existing.id);
    await database.runAsync(`UPDATE completed_sets SET ${updates.join(', ')} WHERE id = ?`, params);
  }
}

export async function getSession(id: UUID): Promise<WorkoutSession | null> {
  const database = await getDatabase();

  const sessionRow = await database.getFirstAsync<any>(
    `SELECT * FROM sessions WHERE id = ?`, [id]
  );
  if (!sessionRow) return null;

  const exerciseRows = await database.getAllAsync<any>(
    'SELECT * FROM session_exercises WHERE session_id = ? ORDER BY exercise_order',
    [id]
  );

  const exercises: SessionExercise[] = [];
  for (const er of exerciseRows) {
    const setRows = await database.getAllAsync<any>(
      'SELECT * FROM completed_sets WHERE session_exercise_id = ? ORDER BY set_index',
      [er.id]
    );

    exercises.push({
      id: er.id,
      exerciseId: er.exercise_id,
      order: er.exercise_order,
      notes: er.notes || undefined,
      sets: setRows.map(s => ({
        setIndex: s.set_index,
        weight: s.weight,
        reps: s.reps,
        completed: s.completed === 1,
      })),
    });
  }

  return {
    id: sessionRow.id,
    templateId: sessionRow.template_id,
    templateName: sessionRow.template_name || undefined,
    status: sessionRow.status,
    startedAt: sessionRow.started_at,
    finishedAt: sessionRow.finished_at || undefined,
    completedAt: sessionRow.completed_at || sessionRow.finished_at || undefined,
    pausedAt: sessionRow.paused_at || undefined,
    duration: sessionRow.duration || undefined,
    pausedDuration: sessionRow.paused_duration || 0,
    totalVolume: sessionRow.total_volume || undefined,
    exercises,
  };
}

export async function getActiveSession(): Promise<WorkoutSession | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ id: UUID }>(
    "SELECT id FROM sessions WHERE status IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1"
  );
  if (!row) return null;
  return getSession(row.id);
}

export async function getAllSessions(): Promise<WorkoutSession[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ id: UUID }>(
    "SELECT id FROM sessions WHERE status = 'completed' ORDER BY started_at DESC"
  );
  const sessions: WorkoutSession[] = [];
  for (const row of rows) {
    const s = await getSession(row.id);
    if (s) sessions.push(s);
  }
  return sessions;
}

// ========================================
// Snapshot & Sync
// ========================================

export async function saveSnapshot(sessionId: UUID, snapshot: WorkoutSnapshot): Promise<void> {
  const database = await getDatabase();
  const json = JSON.stringify(snapshot);

  await database.runAsync(
    `UPDATE sessions SET snapshot = ?, pending_sync = 1 WHERE id = ?`,
    [json, sessionId]
  );

  // Add to sync queue
  const queueId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  await database.runAsync(
    `INSERT OR REPLACE INTO sync_queue (id, session_id, snapshot, status, retry_count, created_at)
     VALUES (?, ?, ?, 'pending', 0, ?)`,
    [queueId, sessionId, json, Date.now()]
  );
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    "SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC"
  );
  return rows.map(r => ({
    id: r.id,
    sessionId: r.session_id,
    snapshot: JSON.parse(r.snapshot),
    status: r.status,
    retryCount: r.retry_count,
    createdAt: r.created_at,
    lastAttempt: r.last_attempt || undefined,
    error: r.error || undefined,
  }));
}

export async function updateSyncStatus(
  id: UUID,
  status: SyncQueueItem['status'],
  error?: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_queue SET status = ?, last_attempt = ?, retry_count = retry_count + 1, error = ? WHERE id = ?`,
    [status, Date.now(), error || null, id]
  );

  if (status === 'completed') {
    await database.runAsync(
      `UPDATE sessions SET pending_sync = 0 WHERE id = (SELECT session_id FROM sync_queue WHERE id = ?)`,
      [id]
    );
  }
}

// ========================================
// Utility
// ========================================

export async function getTotalWorkouts(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sessions WHERE status = 'completed'"
  );
  return row?.count || 0;
}

export async function getTotalVolume(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(total_volume), 0) as total FROM sessions WHERE status = 'completed'"
  );
  return row?.total || 0;
}

export async function addSessionExercise(sessionId: UUID, exercise: SessionExercise): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO session_exercises (id, session_id, exercise_id, exercise_order, notes) VALUES (?, ?, ?, ?, ?)', [exercise.id, sessionId, exercise.exerciseId, exercise.order, exercise.notes || null]);
}

export async function removeSessionExercise(sessionId: UUID, exerciseId: UUID): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM session_exercises WHERE id = ? AND session_id = ?', [exerciseId, sessionId]);
}

export async function addSessionSet(exerciseId: UUID, set: CompletedSet): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO completed_sets (session_exercise_id, set_index, weight, reps, completed) VALUES (?, ?, ?, ?, ?)', [exerciseId, set.setIndex, set.weight, set.reps, set.completed ? 1 : 0]);
}

export async function removeSessionSet(exerciseId: UUID, setIndex: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM completed_sets WHERE session_exercise_id = ? AND set_index = ?', [exerciseId, setIndex]);
}

export async function recordDomainEvent(event: WorkoutDomainEvent): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO domain_events (id, event_type, entity_type, entity_id, created_at, payload) VALUES (?, ?, ?, ?, ?, ?)',
    [event.id, event.eventType, event.entityType, event.entityId, event.createdAt, JSON.stringify(event.payload)]
  );
}

export async function getDomainEventsForSession(sessionId: UUID): Promise<WorkoutDomainEvent[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM domain_events WHERE entity_id = ? ORDER BY created_at ASC', [sessionId]
  );
  return rows.map(row => ({
    id: row.id, eventType: row.event_type, entityType: row.entity_type,
    entityId: row.entity_id, createdAt: row.created_at, payload: JSON.parse(row.payload),
  }));
}

function mapGym(row: any): Gym { return { id: row.id, name: row.name, branchName: row.branch_name, address: row.address, latitude: row.latitude, longitude: row.longitude, externalProvider: row.external_provider, externalPlaceId: row.external_place_id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapEquipment(row: any): Equipment { return { id: row.id, name: row.name, category: row.category, description: row.description, aliases: JSON.parse(row.aliases_json || '[]'), archived: row.archived === 1, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapInventory(row: any): GymEquipmentInventoryItem { return { id: row.id, gymId: row.gym_id, equipmentId: row.equipment_id, quantity: row.quantity, area: row.area, notes: row.notes, status: row.status, verified: row.verified === 1, verifiedAt: row.verified_at, capabilities: row.capabilities_json ? JSON.parse(row.capabilities_json) : null, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapExercise(row: any): ExerciseMaster { return { id: row.id, name: row.name, aliases: JSON.parse(row.aliases_json || '[]'), category: row.category, movementPattern: row.movement_pattern, primaryMuscles: JSON.parse(row.primary_muscles_json), secondaryMuscles: JSON.parse(row.secondary_muscles_json), description: row.description, notes: row.notes, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapMovementFamily(row: any): MovementFamily { return { id: row.id, name: row.name, aliases: JSON.parse(row.aliases_json || '[]'), primaryMuscles: JSON.parse(row.primary_muscles_json || '[]'), secondaryMuscles: JSON.parse(row.secondary_muscles_json || '[]'), category: row.category, description: row.description, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapRequirementGroup(row: any): RequirementGroup { return { id: row.id, exerciseId: row.exercise_id, name: row.name, priority: row.priority, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapEquipmentRequirement(row: any): EquipmentRequirement { return { id: row.id, requirementGroupId: row.requirement_group_id, equipmentId: row.equipment_id, level: row.requirement_level, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at }; }

export async function createGym(gym: Gym): Promise<void> { const database = await getDatabase(); await database.runAsync('INSERT INTO gyms (id,name,branch_name,address,latitude,longitude,external_provider,external_place_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [gym.id,gym.name,gym.branchName ?? null,gym.address ?? null,gym.latitude ?? null,gym.longitude ?? null,gym.externalProvider ?? null,gym.externalPlaceId ?? null,gym.status,gym.createdAt,gym.updatedAt]); }
export async function getGym(id: UUID): Promise<Gym | null> { const row = await (await getDatabase()).getFirstAsync<any>('SELECT * FROM gyms WHERE id = ?', [id]); return row ? mapGym(row) : null; }
export async function listGyms(): Promise<Gym[]> { return (await (await getDatabase()).getAllAsync<any>('SELECT * FROM gyms ORDER BY name')).map(mapGym); }
export async function searchGyms(query: string): Promise<Gym[]> { const like = `%${query.trim()}%`; return (await (await getDatabase()).getAllAsync<any>('SELECT * FROM gyms WHERE name LIKE ? OR branch_name LIKE ? OR address LIKE ? ORDER BY name', [like, like, like])).map(mapGym); }
export async function updateGym(gym: Gym): Promise<void> { const database = await getDatabase(); await database.runAsync('UPDATE gyms SET name=?,branch_name=?,address=?,latitude=?,longitude=?,external_provider=?,external_place_id=?,status=?,updated_at=? WHERE id=?', [gym.name,gym.branchName ?? null,gym.address ?? null,gym.latitude ?? null,gym.longitude ?? null,gym.externalProvider ?? null,gym.externalPlaceId ?? null,gym.status,gym.updatedAt,gym.id]); }

export async function createEquipment(equipment: Equipment): Promise<void> { const database = await getDatabase(); await database.runAsync('INSERT INTO equipment (id,name,category,description,aliases_json,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', [equipment.id,equipment.name,equipment.category,equipment.description ?? null,JSON.stringify(equipment.aliases),equipment.archived ? 1 : 0,equipment.createdAt,equipment.updatedAt]); }
export async function getEquipment(id: UUID): Promise<Equipment | null> { const row = await (await getDatabase()).getFirstAsync<any>('SELECT * FROM equipment WHERE id = ?', [id]); return row ? mapEquipment(row) : null; }
export async function listEquipment(): Promise<Equipment[]> { return (await (await getDatabase()).getAllAsync<any>('SELECT * FROM equipment WHERE archived = 0 ORDER BY name')).map(mapEquipment); }
export async function searchEquipment(query: string): Promise<Equipment[]> { const like = `%${query.trim()}%`; return (await (await getDatabase()).getAllAsync<any>('SELECT * FROM equipment WHERE archived = 0 AND (name LIKE ? OR aliases_json LIKE ?) ORDER BY name', [like, like])).map(mapEquipment); }
export async function updateEquipment(equipment: Equipment): Promise<void> { const database = await getDatabase(); await database.runAsync('UPDATE equipment SET name=?,category=?,description=?,aliases_json=?,archived=?,updated_at=? WHERE id=?', [equipment.name,equipment.category,equipment.description ?? null,JSON.stringify(equipment.aliases),equipment.archived ? 1 : 0,equipment.updatedAt,equipment.id]); }

export async function createInventoryItem(item: GymEquipmentInventoryItem): Promise<void> { const database = await getDatabase(); await database.runAsync('INSERT INTO gym_equipment (id,gym_id,equipment_id,quantity,area,notes,status,verified,verified_at,capabilities_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [item.id,item.gymId,item.equipmentId,item.quantity,item.area ?? null,item.notes ?? null,item.status,item.verified ? 1 : 0,item.verifiedAt ?? null,item.capabilities ? JSON.stringify(item.capabilities) : null,item.createdAt,item.updatedAt]); }
export async function getInventoryItem(id: UUID): Promise<GymEquipmentInventoryItem | null> { const row = await (await getDatabase()).getFirstAsync<any>('SELECT * FROM gym_equipment WHERE id = ?', [id]); return row ? mapInventory(row) : null; }
export async function getInventoryByGymAndEquipment(gymId: UUID, equipmentId: UUID): Promise<GymEquipmentInventoryItem | null> { const row = await (await getDatabase()).getFirstAsync<any>('SELECT * FROM gym_equipment WHERE gym_id = ? AND equipment_id = ?', [gymId,equipmentId]); return row ? mapInventory(row) : null; }
export async function listInventoryByGym(gymId: UUID): Promise<GymEquipmentInventoryItem[]> { return (await (await getDatabase()).getAllAsync<any>('SELECT * FROM gym_equipment WHERE gym_id = ? ORDER BY created_at', [gymId])).map(mapInventory); }
export async function updateInventoryItem(item: GymEquipmentInventoryItem): Promise<void> { const database = await getDatabase(); await database.runAsync('UPDATE gym_equipment SET quantity=?,area=?,notes=?,status=?,verified=?,verified_at=?,capabilities_json=?,updated_at=? WHERE id=?', [item.quantity,item.area ?? null,item.notes ?? null,item.status,item.verified ? 1 : 0,item.verifiedAt ?? null,item.capabilities ? JSON.stringify(item.capabilities) : null,item.updatedAt,item.id]); }
export async function removeInventoryByGymAndEquipment(gymId: UUID, equipmentId: UUID): Promise<void> { await (await getDatabase()).runAsync('DELETE FROM gym_equipment WHERE gym_id = ? AND equipment_id = ?', [gymId,equipmentId]); }
export async function createExerciseMaster(item: ExerciseMaster): Promise<void> { await (await getDatabase()).runAsync('INSERT INTO exercises (id,name,aliases_json,category,movement_pattern,primary_muscles_json,secondary_muscles_json,description,notes,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [item.id,item.name,JSON.stringify(item.aliases),item.category,item.movementPattern,JSON.stringify(item.primaryMuscles),JSON.stringify(item.secondaryMuscles),item.description ?? null,item.notes ?? null,item.status,item.createdAt,item.updatedAt]); }
export async function getExerciseMaster(id: UUID): Promise<ExerciseMaster | null> { const row = await (await getDatabase()).getFirstAsync<any>('SELECT * FROM exercises WHERE id = ?', [id]); return row ? mapExercise(row) : null; }
export async function listExerciseMasters(): Promise<ExerciseMaster[]> { return (await (await getDatabase()).getAllAsync<any>("SELECT * FROM exercises WHERE status = 'active' ORDER BY name")).map(mapExercise); }
export async function searchExerciseMasters(query: string): Promise<ExerciseMaster[]> { const like = `%${query.trim()}%`; return (await (await getDatabase()).getAllAsync<any>("SELECT * FROM exercises WHERE status = 'active' AND (name LIKE ? OR aliases_json LIKE ?) ORDER BY name", [like, like])).map(mapExercise); }
export async function updateExerciseMaster(item: ExerciseMaster): Promise<void> { await (await getDatabase()).runAsync('UPDATE exercises SET name=?,aliases_json=?,category=?,movement_pattern=?,primary_muscles_json=?,secondary_muscles_json=?,description=?,notes=?,status=?,updated_at=? WHERE id=?', [item.name,JSON.stringify(item.aliases),item.category,item.movementPattern,JSON.stringify(item.primaryMuscles),JSON.stringify(item.secondaryMuscles),item.description ?? null,item.notes ?? null,item.status,item.updatedAt,item.id]); }

export async function createMovementFamily(item: MovementFamily): Promise<void> { await (await getDatabase()).runAsync('INSERT INTO movement_families (id,name,aliases_json,primary_muscles_json,secondary_muscles_json,category,description,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [item.id,item.name,JSON.stringify(item.aliases),JSON.stringify(item.primaryMuscles),JSON.stringify(item.secondaryMuscles),item.category ?? null,item.description ?? null,item.status,item.createdAt,item.updatedAt]); }
export async function getMovementFamily(id: UUID): Promise<MovementFamily | null> { const row = await (await getDatabase()).getFirstAsync<any>('SELECT * FROM movement_families WHERE id=?', [id]); return row ? mapMovementFamily(row) : null; }
export async function listMovementFamilies(): Promise<MovementFamily[]> { return (await (await getDatabase()).getAllAsync<any>("SELECT * FROM movement_families WHERE status='active' ORDER BY name")).map(mapMovementFamily); }
export async function searchMovementFamilies(query: string): Promise<MovementFamily[]> { const like = `%${query.trim()}%`; return (await (await getDatabase()).getAllAsync<any>("SELECT * FROM movement_families WHERE status='active' AND (name LIKE ? OR aliases_json LIKE ?) ORDER BY name", [like, like])).map(mapMovementFamily); }
export async function updateMovementFamily(item: MovementFamily): Promise<void> { await (await getDatabase()).runAsync('UPDATE movement_families SET name=?,aliases_json=?,primary_muscles_json=?,secondary_muscles_json=?,category=?,description=?,status=?,updated_at=? WHERE id=?', [item.name,JSON.stringify(item.aliases),JSON.stringify(item.primaryMuscles),JSON.stringify(item.secondaryMuscles),item.category ?? null,item.description ?? null,item.status,item.updatedAt,item.id]); }
export async function assignExerciseMovementFamily(item: ExerciseMovementFamily): Promise<void> { await (await getDatabase()).runAsync('INSERT INTO exercise_movement_families (id,exercise_id,movement_family_id,role,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(exercise_id,movement_family_id) DO UPDATE SET role=excluded.role,updated_at=excluded.updated_at', [item.id,item.exerciseId,item.movementFamilyId,item.role,item.createdAt,item.updatedAt]); }
export async function removeExerciseMovementFamily(exerciseId: UUID, familyId: UUID): Promise<void> { await (await getDatabase()).runAsync('DELETE FROM exercise_movement_families WHERE exercise_id=? AND movement_family_id=?', [exerciseId,familyId]); }
export async function getMovementFamiliesForExercise(exerciseId: UUID): Promise<MovementFamily[]> { return (await (await getDatabase()).getAllAsync<any>("SELECT f.* FROM movement_families f JOIN exercise_movement_families x ON x.movement_family_id=f.id WHERE x.exercise_id=? AND f.status='active' ORDER BY f.name", [exerciseId])).map(mapMovementFamily); }
export async function getExercisesForMovementFamily(familyId: UUID): Promise<ExerciseMaster[]> { return (await (await getDatabase()).getAllAsync<any>("SELECT e.* FROM exercises e JOIN exercise_movement_families x ON x.exercise_id=e.id WHERE x.movement_family_id=? AND e.status='active' ORDER BY e.name", [familyId])).map(mapExercise); }
export async function getMovementFamiliesForMuscle(muscle: string): Promise<MovementFamily[]> { const like = `%\"${muscle}\"%`; return (await (await getDatabase()).getAllAsync<any>("SELECT * FROM movement_families WHERE status='active' AND (primary_muscles_json LIKE ? OR secondary_muscles_json LIKE ?) ORDER BY name", [like, like])).map(mapMovementFamily); }
export async function createRequirementGroup(item: RequirementGroup): Promise<void> { await (await getDatabase()).runAsync('INSERT INTO exercise_requirement_groups (id,exercise_id,name,priority,created_at,updated_at) VALUES (?,?,?,?,?,?)', [item.id,item.exerciseId,item.name ?? null,item.priority,item.createdAt,item.updatedAt]); }
export async function getRequirementGroup(id: UUID): Promise<RequirementGroup | null> { const row = await (await getDatabase()).getFirstAsync<any>('SELECT * FROM exercise_requirement_groups WHERE id=?', [id]); return row ? mapRequirementGroup(row) : null; }
export async function removeRequirementGroup(id: UUID): Promise<void> { await (await getDatabase()).runAsync('DELETE FROM exercise_requirement_groups WHERE id=?', [id]); }
export async function getRequirementGroupsForExercise(exerciseId: UUID): Promise<RequirementGroup[]> { return (await (await getDatabase()).getAllAsync<any>('SELECT * FROM exercise_requirement_groups WHERE exercise_id=? ORDER BY priority,id', [exerciseId])).map(mapRequirementGroup); }
export async function addEquipmentRequirement(item: EquipmentRequirement): Promise<void> { await (await getDatabase()).runAsync('INSERT INTO exercise_equipment_requirements (id,requirement_group_id,equipment_id,requirement_level,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(requirement_group_id,equipment_id) DO UPDATE SET requirement_level=excluded.requirement_level,notes=excluded.notes,updated_at=excluded.updated_at', [item.id,item.requirementGroupId,item.equipmentId,item.level,item.notes ?? null,item.createdAt,item.updatedAt]); }
export async function getEquipmentRequirement(id: UUID): Promise<EquipmentRequirement | null> { const row = await (await getDatabase()).getFirstAsync<any>('SELECT * FROM exercise_equipment_requirements WHERE id=?', [id]); return row ? mapEquipmentRequirement(row) : null; }
export async function updateEquipmentRequirement(item: EquipmentRequirement): Promise<void> { await (await getDatabase()).runAsync('UPDATE exercise_equipment_requirements SET equipment_id=?,requirement_level=?,notes=?,updated_at=? WHERE id=?', [item.equipmentId,item.level,item.notes ?? null,item.updatedAt,item.id]); }
export async function removeEquipmentRequirement(id: UUID): Promise<void> { await (await getDatabase()).runAsync('DELETE FROM exercise_equipment_requirements WHERE id=?', [id]); }
export async function getEquipmentRequirementsForGroup(groupId: UUID): Promise<EquipmentRequirement[]> { return (await (await getDatabase()).getAllAsync<any>('SELECT * FROM exercise_equipment_requirements WHERE requirement_group_id=? ORDER BY created_at,id', [groupId])).map(mapEquipmentRequirement); }

// ========================================
// Store Factory - wraps all functions into a GymFlowStore interface
// ========================================

let _store: GymFlowStore | null = null;

export function createStore(): GymFlowStore {
  if (_store) return _store;

  _store = {
    sessions: {
      create: createSession,
      get: getSession,
      updateStatus: updateSessionStatus,
      updateSet,
      addExercise: addSessionExercise,
      removeExercise: removeSessionExercise,
      addSet: addSessionSet,
      removeSet: removeSessionSet,
      getActive: getActiveSession,
      getAll: getAllSessions,
      getTotalWorkouts,
      getTotalVolume,
    },
    templates: {
      create: createTemplate,
      update: updateTemplate,
      delete: deleteTemplate,
      get: getTemplate,
      getAll: getAllTemplates,
    },
    sync: {
      saveSnapshot,
      getPending: getPendingSyncItems,
      updateStatus: updateSyncStatus,
    },
    events: {
      record: recordDomainEvent,
      getForSession: getDomainEventsForSession,
    },
    gyms: { create: createGym, get: getGym, list: listGyms, search: searchGyms, update: updateGym },
    equipment: { create: createEquipment, get: getEquipment, list: listEquipment, search: searchEquipment, update: updateEquipment },
    inventory: { create: createInventoryItem, get: getInventoryItem, getByGymAndEquipment: getInventoryByGymAndEquipment, listByGym: listInventoryByGym, update: updateInventoryItem, removeByGymAndEquipment: removeInventoryByGymAndEquipment },
    exercises: { create: createExerciseMaster, get: getExerciseMaster, list: listExerciseMasters, search: searchExerciseMasters, update: updateExerciseMaster },
    taxonomy: {
      createFamily: createMovementFamily, getFamily: getMovementFamily, listFamilies: listMovementFamilies, searchFamilies: searchMovementFamilies, updateFamily: updateMovementFamily,
      assign: assignExerciseMovementFamily, removeAssignment: removeExerciseMovementFamily, familiesForExercise: getMovementFamiliesForExercise, exercisesForFamily: getExercisesForMovementFamily, familiesForMuscle: getMovementFamiliesForMuscle,
      createGroup: createRequirementGroup, getGroup: getRequirementGroup, removeGroup: removeRequirementGroup, groupsForExercise: getRequirementGroupsForExercise,
      addRequirement: addEquipmentRequirement, getRequirement: getEquipmentRequirement, updateRequirement: updateEquipmentRequirement, removeRequirement: removeEquipmentRequirement, requirementsForGroup: getEquipmentRequirementsForGroup,
    },
  };

  return _store;
}
