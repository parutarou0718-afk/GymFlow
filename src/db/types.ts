// ========================================
// GymFlow - Storage Interface Definitions
// Decouples business logic from storage implementation
// ========================================

import type {
  UUID,
  WorkoutSession,
  SessionStatus,
  WorkoutTemplate,
  WorkoutSnapshot,
  SyncQueueItem,
  CompletedSet,
  WorkoutDomainEvent,
} from '../types';

// ── Session Store ──

export interface SessionStore {
  create(session: WorkoutSession): Promise<void>;
  get(id: UUID): Promise<WorkoutSession | null>;
  updateStatus(
    id: UUID,
    status: SessionStatus,
    extra?: Partial<Pick<WorkoutSession, 'pausedAt' | 'completedAt' | 'finishedAt' | 'duration' | 'totalVolume' | 'pausedDuration'>>
  ): Promise<void>;
  updateSet(
    exerciseId: UUID,
    setIndex: number,
    data: { weight?: number; reps?: number; completed?: boolean }
  ): Promise<void>;
  getActive(): Promise<WorkoutSession | null>;
  getAll(): Promise<WorkoutSession[]>;
  getTotalWorkouts(): Promise<number>;
  getTotalVolume(): Promise<number>;
}

// ── Template Store ──

export interface TemplateStore {
  create(template: WorkoutTemplate): Promise<void>;
  update(template: WorkoutTemplate): Promise<void>;
  delete(id: UUID): Promise<void>;
  get(id: UUID): Promise<WorkoutTemplate | null>;
  getAll(): Promise<WorkoutTemplate[]>;
}

// ── Sync Store ──

export interface SyncStore {
  saveSnapshot(sessionId: UUID, snapshot: WorkoutSnapshot): Promise<void>;
  getPending(): Promise<SyncQueueItem[]>;
  updateStatus(id: UUID, status: SyncQueueItem['status'], error?: string): Promise<void>;
}

export interface DomainEventStore {
  record(event: WorkoutDomainEvent): Promise<void>;
  getForSession(sessionId: UUID): Promise<WorkoutDomainEvent[]>;
}

// ── Composite Store ──

export interface GymFlowStore {
  sessions: SessionStore;
  templates: TemplateStore;
  sync: SyncStore;
  events: DomainEventStore;
}
// 注: 此文件为存储层接口定义，所有业务层代码应依赖此接口而非 database.ts 实现。
// 如需切换存储实现（如 SQLite → Supabase），只需新建实现文件并在 stores.tsx 中更换即可。
