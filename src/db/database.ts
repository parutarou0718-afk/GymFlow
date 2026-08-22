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
} from '../types';
import type { GymFlowStore } from './types';

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
      duration INTEGER,
      paused_duration INTEGER DEFAULT 0,
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

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_pending_sync ON sessions(pending_sync);
    CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);
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
    `INSERT INTO sessions (id, template_id, template_name, status, started_at, finished_at, duration, paused_duration, total_volume, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.templateId,
      session.templateName || null,
      session.status,
      session.startedAt,
      session.finishedAt || null,
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
  extra?: Partial<Pick<WorkoutSession, 'finishedAt' | 'duration' | 'totalVolume' | 'pausedDuration'>>
): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();

  const sets: string[] = ['status = ?', 'updated_at = ?'];
  const params: any[] = [status, now];

  if (extra?.finishedAt) {
    sets.push('finished_at = ?');
    params.push(extra.finishedAt);
  }
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
  };

  return _store;
}
