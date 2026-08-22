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
  SessionExercise,
  WorkoutDomainEvent,
} from '../types';
import type { Gym } from '../modules/gym';
import type { Equipment } from '../modules/equipment';
import type { GymEquipmentInventoryItem } from '../modules/gym-inventory';
import type { ExerciseMaster } from '../modules/exercise';

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
  addExercise(sessionId: UUID, exercise: SessionExercise): Promise<void>;
  removeExercise(sessionId: UUID, exerciseId: UUID): Promise<void>;
  addSet(exerciseId: UUID, set: CompletedSet): Promise<void>;
  removeSet(exerciseId: UUID, setIndex: number): Promise<void>;
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

export interface GymStore { create(gym: Gym): Promise<void>; get(id: UUID): Promise<Gym | null>; list(): Promise<Gym[]>; search(query: string): Promise<Gym[]>; update(gym: Gym): Promise<void>; }
export interface EquipmentStore { create(equipment: Equipment): Promise<void>; get(id: UUID): Promise<Equipment | null>; list(): Promise<Equipment[]>; search(query: string): Promise<Equipment[]>; update(equipment: Equipment): Promise<void>; }
export interface InventoryStore { create(item: GymEquipmentInventoryItem): Promise<void>; get(id: UUID): Promise<GymEquipmentInventoryItem | null>; getByGymAndEquipment(gymId: UUID, equipmentId: UUID): Promise<GymEquipmentInventoryItem | null>; listByGym(gymId: UUID): Promise<GymEquipmentInventoryItem[]>; update(item: GymEquipmentInventoryItem): Promise<void>; removeByGymAndEquipment(gymId: UUID, equipmentId: UUID): Promise<void>; }
export interface ExerciseStore { create(item: ExerciseMaster): Promise<void>; get(id: UUID): Promise<ExerciseMaster | null>; list(): Promise<ExerciseMaster[]>; search(query: string): Promise<ExerciseMaster[]>; update(item: ExerciseMaster): Promise<void>; }

// ── Composite Store ──

export interface GymFlowStore {
  sessions: SessionStore;
  templates: TemplateStore;
  sync: SyncStore;
  events: DomainEventStore;
  gyms: GymStore;
  equipment: EquipmentStore;
  inventory: InventoryStore;
  exercises: ExerciseStore;
}
// 注: 此文件为存储层接口定义，所有业务层代码应依赖此接口而非 database.ts 实现。
// 如需切换存储实现（如 SQLite → Supabase），只需新建实现文件并在 stores.tsx 中更换即可。
