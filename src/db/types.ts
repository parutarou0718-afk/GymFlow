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
import type { MovementFamily } from '../modules/movement-family';
import type { EquipmentRequirement, ExerciseMovementFamily, RequirementGroup } from '../modules/exercise-equipment';
import type { ExerciseSubstitution } from '../modules/exercise-substitution';
import type { UserProfile } from '../modules/user';
import type { UserGymRelationship } from '../modules/user-gym';
import type { ExternalGymLink } from '../modules/gym-discovery';

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

export interface WorkoutCompletionInput {
  sessionId: UUID;
  completedAt: number;
  duration: number;
  pausedDuration: number;
  totalVolume: number;
  snapshot: WorkoutSnapshot;
  event: WorkoutDomainEvent;
}

export interface WorkoutCompletionStore {
  complete(input: WorkoutCompletionInput): Promise<void>;
}

export interface UserStore { create(user: UserProfile): Promise<void>; get(id: UUID): Promise<UserProfile | null>; list(): Promise<UserProfile[]>; update(user: UserProfile): Promise<void>; }
export interface UserGymStore { get(userId: UUID, gymId: UUID): Promise<UserGymRelationship | null>; listByUser(userId: UUID): Promise<UserGymRelationship[]>; upsert(item: UserGymRelationship): Promise<void>; delete(userId: UUID, gymId: UUID): Promise<void>; setHome(item: UserGymRelationship): Promise<void>; clearHome(userId: UUID): Promise<void>; }

export interface GymStore { create(gym: Gym): Promise<void>; get(id: UUID): Promise<Gym | null>; list(): Promise<Gym[]>; search(query: string): Promise<Gym[]>; update(gym: Gym): Promise<void>; }
export interface GymExternalLinkStore { get(provider: string, externalPlaceId: string): Promise<ExternalGymLink | null>; create(link: ExternalGymLink): Promise<void>; }
export interface GymDiscoveryImportStore { import(gym: Gym, link: ExternalGymLink): Promise<void>; }
export interface EquipmentStore { create(equipment: Equipment): Promise<void>; get(id: UUID): Promise<Equipment | null>; list(): Promise<Equipment[]>; search(query: string): Promise<Equipment[]>; update(equipment: Equipment): Promise<void>; }
export interface InventoryStore { create(item: GymEquipmentInventoryItem): Promise<void>; get(id: UUID): Promise<GymEquipmentInventoryItem | null>; getByGymAndEquipment(gymId: UUID, equipmentId: UUID): Promise<GymEquipmentInventoryItem | null>; listByGym(gymId: UUID): Promise<GymEquipmentInventoryItem[]>; update(item: GymEquipmentInventoryItem): Promise<void>; removeByGymAndEquipment(gymId: UUID, equipmentId: UUID): Promise<void>; }
export interface ExerciseStore { create(item: ExerciseMaster): Promise<void>; get(id: UUID): Promise<ExerciseMaster | null>; list(): Promise<ExerciseMaster[]>; search(query: string): Promise<ExerciseMaster[]>; update(item: ExerciseMaster): Promise<void>; }
export interface SubstitutionStore { create(item: ExerciseSubstitution): Promise<void>; get(id: UUID): Promise<ExerciseSubstitution | null>; listForSource(id: UUID): Promise<ExerciseSubstitution[]>; listToTarget(id: UUID): Promise<ExerciseSubstitution[]>; update(item: ExerciseSubstitution): Promise<void>; }
export interface TaxonomyStore {
  createFamily(item: MovementFamily): Promise<void>; getFamily(id: UUID): Promise<MovementFamily | null>; listFamilies(): Promise<MovementFamily[]>; searchFamilies(query: string): Promise<MovementFamily[]>; updateFamily(item: MovementFamily): Promise<void>;
  assign(item: ExerciseMovementFamily): Promise<void>; removeAssignment(exerciseId: UUID, movementFamilyId: UUID): Promise<void>; assignmentsForExercise(exerciseId: UUID): Promise<ExerciseMovementFamily[]>; familiesForExercise(exerciseId: UUID): Promise<MovementFamily[]>; exercisesForFamily(familyId: UUID): Promise<ExerciseMaster[]>; familiesForMuscle(muscle: string): Promise<MovementFamily[]>;
  createGroup(item: RequirementGroup): Promise<void>; getGroup(id: UUID): Promise<RequirementGroup | null>; removeGroup(id: UUID): Promise<void>; groupsForExercise(exerciseId: UUID): Promise<RequirementGroup[]>;
  addRequirement(item: EquipmentRequirement): Promise<void>; getRequirement(id: UUID): Promise<EquipmentRequirement | null>; updateRequirement(item: EquipmentRequirement): Promise<void>; removeRequirement(id: UUID): Promise<void>; requirementsForGroup(groupId: UUID): Promise<EquipmentRequirement[]>;
}

// ── Composite Store ──

export interface GymFlowStore {
  sessions: SessionStore;
  templates: TemplateStore;
  sync: SyncStore;
  events: DomainEventStore;
  workoutCompletion: WorkoutCompletionStore;
  gyms: GymStore;
  gymExternalLinks: GymExternalLinkStore;
  gymDiscoveryImport: GymDiscoveryImportStore;
  equipment: EquipmentStore;
  inventory: InventoryStore;
  exercises: ExerciseStore;
  taxonomy: TaxonomyStore;
  substitutions: SubstitutionStore;
  users: UserStore;
  userGyms: UserGymStore;
}
// 注: 此文件为存储层接口定义，所有业务层代码应依赖此接口而非 database.ts 实现。
// 如需切换存储实现（如 SQLite → Supabase），只需新建实现文件并在 stores.tsx 中更换即可。
