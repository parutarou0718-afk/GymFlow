import { calculateSessionVolume } from '../lib/utils';
import { exerciseDB } from '../lib/exercise-db';
import type {
  CompletedSet,
  SyncQueueItem,
  WorkoutDomainEvent,
  WorkoutSession,
  WorkoutSnapshot,
  WorkoutTemplate,
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
import type { ExerciseSubstitution } from '../modules/exercise-substitution';
import { substitutionSeeds } from '../modules/exercise-substitution/seed';
import type { UserProfile } from '../modules/user';
import { createDefaultUser } from '../modules/user';
import type { UserGymRelationship } from '../modules/user-gym';
import type { ExternalGymLink } from '../modules/gym-discovery';
import type { GymContext } from '../modules/gym-context';

const DAY = 24 * 60 * 60 * 1000;
const DEMO_NOW = new Date('2026-08-20T18:00:00.000Z').getTime();

function exercise(id: string) {
  const value = exerciseDB.getById(id);
  if (!value) throw new Error(`Missing embedded exercise: ${id}`);
  return value;
}

const benchPress = exercise('bench_press');
const inclineBenchPress = exercise('incline_bench_press');
const barbellRow = exercise('barbell_row');
const latPulldown = exercise('lat_pulldown');

const seedTemplates: WorkoutTemplate[] = [
  {
    id: 'web-template-push',
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps',
    createdAt: DEMO_NOW - 14 * DAY,
    updatedAt: DEMO_NOW - DAY,
    exercises: [
      {
        id: 'web-template-push-bench',
        exerciseId: benchPress.id,
        exercise: benchPress,
        order: 0,
        targetSets: [
          { setIndex: 0, weight: 60, reps: 8, unit: 'kg' },
          { setIndex: 1, weight: 60, reps: 8, unit: 'kg' },
          { setIndex: 2, weight: 60, reps: 8, unit: 'kg' },
        ],
      },
      {
        id: 'web-template-push-incline',
        exerciseId: inclineBenchPress.id,
        exercise: inclineBenchPress,
        order: 1,
        targetSets: [
          { setIndex: 0, weight: 40, reps: 10, unit: 'kg' },
          { setIndex: 1, weight: 40, reps: 10, unit: 'kg' },
          { setIndex: 2, weight: 40, reps: 10, unit: 'kg' },
        ],
      },
    ],
  },
  {
    id: 'web-template-pull',
    name: 'Pull Day',
    description: 'Back and biceps',
    createdAt: DEMO_NOW - 10 * DAY,
    updatedAt: DEMO_NOW - 2 * DAY,
    exercises: [
      {
        id: 'web-template-pull-row',
        exerciseId: barbellRow.id,
        exercise: barbellRow,
        order: 0,
        targetSets: [
          { setIndex: 0, weight: 50, reps: 10, unit: 'kg' },
          { setIndex: 1, weight: 50, reps: 10, unit: 'kg' },
          { setIndex: 2, weight: 50, reps: 10, unit: 'kg' },
        ],
      },
      {
        id: 'web-template-pull-pulldown',
        exerciseId: latPulldown.id,
        exercise: latPulldown,
        order: 1,
        targetSets: [
          { setIndex: 0, weight: 45, reps: 12, unit: 'kg' },
          { setIndex: 1, weight: 45, reps: 12, unit: 'kg' },
          { setIndex: 2, weight: 45, reps: 12, unit: 'kg' },
        ],
      },
    ],
  },
];

const seedSessions: WorkoutSession[] = [
  {
    id: 'web-session-demo-1',
    templateId: 'web-template-push',
    templateName: 'Push Day',
    status: 'completed',
    startedAt: DEMO_NOW - 3 * DAY,
    finishedAt: DEMO_NOW - 3 * DAY + 52 * 60 * 1000,
    duration: 52 * 60,
    pausedDuration: 0,
    totalVolume: 2640,
    exercises: [
      {
        id: 'web-session-demo-bench',
        exerciseId: benchPress.id,
        exercise: benchPress,
        order: 0,
        sets: [
          { setIndex: 0, weight: 60, reps: 8, completed: true },
          { setIndex: 1, weight: 60, reps: 8, completed: true },
          { setIndex: 2, weight: 60, reps: 8, completed: true },
        ],
      },
      {
        id: 'web-session-demo-incline',
        exerciseId: inclineBenchPress.id,
        exercise: inclineBenchPress,
        order: 1,
        sets: [
          { setIndex: 0, weight: 40, reps: 10, completed: true },
          { setIndex: 1, weight: 40, reps: 10, completed: true },
          { setIndex: 2, weight: 40, reps: 10, completed: true },
        ],
      },
    ],
  },
];

const seedEquipment: Equipment[] = [
  ['Barbell', 'free_weight'], ['Dumbbell', 'free_weight'], ['Flat Bench', 'free_weight'], ['Adjustable Bench', 'free_weight'], ['Power Rack', 'rack'], ['Squat Rack', 'rack'], ['Smith Machine', 'rack'], ['Hack Squat', 'machine'], ['Leg Press', 'machine'], ['Leg Extension', 'machine'], ['Leg Curl', 'machine'], ['Hip Abductor', 'machine'], ['Hip Adductor', 'machine'], ['Calf Raise', 'machine'], ['Chest Press', 'machine'], ['Incline Chest Press', 'machine'], ['Pec Deck', 'machine'], ['Shoulder Press', 'machine'], ['Lat Pulldown', 'cable'], ['Seated Row', 'machine'], ['Cable Station', 'cable'], ['Functional Trainer', 'cable']
].map(([name, category], index) => ({ id: `web-equipment-${index + 1}`, name, category: category as Equipment['category'], aliases: name === 'Hack Squat' ? ['Hack Squat Machine', '哈克深蹲', '哈克机'] : [], archived: false, createdAt: DEMO_NOW, updatedAt: DEMO_NOW }));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createQueueId(): string {
  return `web-sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createWebStore(): GymFlowStore {
  let templates = clone(seedTemplates);
  let sessions = clone(seedSessions);
  let syncQueue: SyncQueueItem[] = [];
  let events: WorkoutDomainEvent[] = [];
  let gyms: Gym[] = [];
  let equipment = clone(seedEquipment);
  let inventory: GymEquipmentInventoryItem[] = [];
  let exercises: ExerciseMaster[] = clone(exerciseSeeds);
  let movementFamilies: MovementFamily[] = clone(movementFamilySeeds);
  let assignments: ExerciseMovementFamily[] = movementFamilyAssignments.map(([exerciseId, movementFamilyId, role], index) => ({ id: `web-family-assignment-${index + 1}`, exerciseId, movementFamilyId, role, createdAt: DEMO_NOW, updatedAt: DEMO_NOW }));
  let requirementGroups: RequirementGroup[] = clone(requirementGroupSeeds);
  let equipmentRequirements: EquipmentRequirement[] = clone(equipmentRequirementSeeds);
  let substitutions: ExerciseSubstitution[] = clone(substitutionSeeds);
  let users: UserProfile[] = [createDefaultUser(DEMO_NOW)];
  let userGyms: UserGymRelationship[] = [];
  let gymContexts: GymContext[] = [];
  let gymExternalLinks: ExternalGymLink[] = [];

  return {
    sessions: {
      async create(session) {
        sessions.push(clone(session));
      },
      async get(id) {
        const session = sessions.find(item => item.id === id);
        return session ? clone(session) : null;
      },
      async updateStatus(id, status, extra) {
        const session = sessions.find(item => item.id === id);
        if (session) Object.assign(session, { status }, extra);
      },
      async updateSet(exerciseId, setIndex, data) {
        for (const session of sessions) {
          const exercise = session.exercises.find(item => item.id === exerciseId);
          const set = exercise?.sets.find(item => item.setIndex === setIndex);
          if (set) {
            Object.assign(set, data);
            return;
          }
        }
      },
      async addExercise(sessionId, exercise) {
        const session = sessions.find(item => item.id === sessionId);
        if (session) session.exercises.push(clone(exercise));
      },
      async removeExercise(sessionId, exerciseId) {
        const session = sessions.find(item => item.id === sessionId);
        if (session) session.exercises = session.exercises.filter(item => item.id !== exerciseId);
      },
      async addSet(exerciseId, set) {
        for (const session of sessions) {
          const exercise = session.exercises.find(item => item.id === exerciseId);
          if (exercise) { exercise.sets.push(clone(set)); return; }
        }
      },
      async removeSet(exerciseId, setIndex) {
        for (const session of sessions) {
          const exercise = session.exercises.find(item => item.id === exerciseId);
          if (exercise) { exercise.sets = exercise.sets.filter(set => set.setIndex !== setIndex); return; }
        }
      },
      async replaceExerciseAtomically(input) {
        const nextSessions = clone(sessions);
        const session = nextSessions.find(item => item.id === input.sessionId);
        if (!session) throw new Error('WORKOUT_EXERCISE_NOT_FOUND');
        if (session.status !== 'active' && session.status !== 'paused') throw new Error('WORKOUT_NOT_ACTIVE');
        const index = session.exercises.findIndex(item => item.id === input.sessionExerciseId);
        if (index < 0) throw new Error('WORKOUT_EXERCISE_NOT_FOUND');
        const original = session.exercises[index];
        const completedSetCount = original.sets.filter(set => set.completed).length;
        if (completedSetCount !== input.expectedCompletedSetCount) throw new Error('REPLACEMENT_OPTIONS_CHANGED');
        if (original.sets.length > 0 && completedSetCount === original.sets.length) throw new Error('EXERCISE_ALREADY_COMPLETED');
        if (original.exerciseId === input.replacementExerciseId) throw new Error('INVALID_REPLACEMENT');

        if (completedSetCount === 0) {
          session.exercises[index] = {
            ...original,
            exerciseId: input.replacementExerciseId,
            exercise: undefined,
            sets: original.sets.map(set => ({ ...set, weight: 0, completed: false })),
            replacedFromExerciseId: original.exerciseId,
            replacementReason: input.reason,
            replacementOccurredAt: input.occurredAt,
          };
        } else {
          const pendingSets = original.sets.filter(set => !set.completed);
          const originalOrder = original.order;
          session.exercises[index] = { ...original, sets: original.sets.filter(set => set.completed) };
          session.exercises = session.exercises.map((exercise, exerciseIndex) => exerciseIndex === index || exercise.order <= originalOrder ? exercise : { ...exercise, order: exercise.order + 1 });
          session.exercises.splice(index + 1, 0, {
            id: input.replacementSessionExerciseId,
            exerciseId: input.replacementExerciseId,
            order: originalOrder + 1,
            sets: pendingSets.map((set, setIndex) => ({ ...set, setIndex, weight: 0, completed: false })),
            replacedFromExerciseId: original.exerciseId,
            replacementReason: input.reason,
            replacementOccurredAt: input.occurredAt,
          });
        }

        sessions = nextSessions;
        events = [...events.map(clone), clone(input.event)];
      },
      async getActive() {
        const session = sessions.find(item => item.status === 'active' || item.status === 'paused');
        return session ? clone(session) : null;
      },
      async getAll() {
        return sessions
          .filter(item => item.status === 'completed')
          .sort((a, b) => b.startedAt - a.startedAt)
          .map(clone);
      },
      async getTotalWorkouts() {
        return sessions.filter(item => item.status === 'completed').length;
      },
      async getTotalVolume() {
        return sessions
          .filter(item => item.status === 'completed')
          .reduce((total, session) => total + (session.totalVolume ?? calculateSessionVolume(session)), 0);
      },
    },
    templates: {
      async create(template) {
        templates.push(clone(template));
      },
      async update(template) {
        const index = templates.findIndex(item => item.id === template.id);
        if (index >= 0) templates[index] = clone(template);
      },
      async delete(id) {
        templates = templates.filter(item => item.id !== id);
      },
      async get(id) {
        const template = templates.find(item => item.id === id);
        return template ? clone(template) : null;
      },
      async getAll() {
        return [...templates].sort((a, b) => b.updatedAt - a.updatedAt).map(clone);
      },
    },
    sync: {
      async saveSnapshot(sessionId, snapshot) {
        const session = sessions.find(item => item.id === sessionId);
        if (session) session.totalVolume = snapshot.totalVolume;
        syncQueue = syncQueue.filter(item => item.sessionId !== sessionId);
        syncQueue.push({
          id: createQueueId(),
          sessionId,
          snapshot: clone(snapshot),
          status: 'pending',
          retryCount: 0,
          createdAt: Date.now(),
        });
      },
      async getPending() {
        return syncQueue
          .filter(item => item.status === 'pending' || item.status === 'failed')
          .map(clone);
      },
      async updateStatus(id, status, error) {
        const item = syncQueue.find(queueItem => queueItem.id === id);
        if (!item) return;
        item.status = status;
        item.error = error;
        item.lastAttempt = Date.now();
        item.retryCount += 1;
      },
    },
    events: {
      async record(event) {
        events.push(clone(event));
      },
      async getForSession(sessionId) {
        return events.filter(event => event.entityId === sessionId).map(clone);
      },
    },
    workoutCompletion: {
      async complete(input) {
        const nextSessions = clone(sessions);
        const session = nextSessions.find(item => item.id === input.sessionId);
        if (!session) throw new Error(`Workout session not found: ${input.sessionId}`);
        Object.assign(session, {
          status: 'completed',
          finishedAt: input.completedAt,
          completedAt: input.completedAt,
          pausedAt: undefined,
          duration: input.duration,
          pausedDuration: input.pausedDuration,
          totalVolume: input.totalVolume,
        });

        const nextSyncQueue = syncQueue
          .filter(item => item.sessionId !== input.sessionId)
          .map(clone);
        nextSyncQueue.push({
          id: createQueueId(),
          sessionId: input.sessionId,
          snapshot: clone(input.snapshot),
          status: 'pending',
          retryCount: 0,
          createdAt: Date.now(),
        });
        const nextEvents = [...events.map(clone), clone(input.event)];

        sessions = nextSessions;
        syncQueue = nextSyncQueue;
        events = nextEvents;
      },
    },
    gyms: {
      async create(gym) { gyms.push(clone(gym)); },
      async get(id) { const gym = gyms.find(item => item.id === id); return gym ? clone(gym) : null; },
      async list() { return [...gyms].sort((a, b) => a.name.localeCompare(b.name)).map(clone); },
      async search(query) { const normalized = query.trim().toLowerCase(); return gyms.filter(item => !normalized || `${item.name} ${item.branchName ?? ''} ${item.address ?? ''}`.toLowerCase().includes(normalized)).map(clone); },
      async update(gym) { const index = gyms.findIndex(item => item.id === gym.id); if (index >= 0) gyms[index] = clone(gym); },
    },
    equipment: {
      async create(item) { equipment.push(clone(item)); },
      async get(id) { const item = equipment.find(value => value.id === id); return item ? clone(item) : null; },
      async list() { return equipment.filter(item => !item.archived).sort((a, b) => a.name.localeCompare(b.name)).map(clone); },
      async search(query) { const normalized = query.trim().toLowerCase(); return equipment.filter(item => !item.archived && (!normalized || [item.name, ...item.aliases].some(value => value.toLowerCase().includes(normalized)))).map(clone); },
      async update(item) { const index = equipment.findIndex(value => value.id === item.id); if (index >= 0) equipment[index] = clone(item); },
    },
    inventory: {
      async create(item) { inventory.push(clone(item)); },
      async get(id) { const item = inventory.find(value => value.id === id); return item ? clone(item) : null; },
      async getByGymAndEquipment(gymId, equipmentId) { const item = inventory.find(value => value.gymId === gymId && value.equipmentId === equipmentId); return item ? clone(item) : null; },
      async listByGym(gymId) { return inventory.filter(item => item.gymId === gymId).sort((a, b) => a.createdAt - b.createdAt).map(clone); },
      async update(item) { const index = inventory.findIndex(value => value.id === item.id); if (index >= 0) inventory[index] = clone(item); },
      async removeByGymAndEquipment(gymId, equipmentId) { inventory = inventory.filter(item => item.gymId !== gymId || item.equipmentId !== equipmentId); },
    },
    exercises: {
      async create(item) { exercises.push(clone(item)); }, async get(id) { const item = exercises.find(value => value.id === id); return item ? clone(item) : null; },
      async list() { return exercises.filter(item => item.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(clone); },
      async search(query) { const normalized = query.trim().toLowerCase(); return exercises.filter(item => item.status === 'active' && (!normalized || [item.name, ...item.aliases].some(value => value.toLowerCase().includes(normalized)))).map(clone); },
      async update(item) { const index = exercises.findIndex(value => value.id === item.id); if (index >= 0) exercises[index] = clone(item); },
    },
    taxonomy: {
      async createFamily(item) { movementFamilies.push(clone(item)); },
      async getFamily(id) { const item = movementFamilies.find(value => value.id === id); return item ? clone(item) : null; },
      async listFamilies() { return movementFamilies.filter(item => item.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(clone); },
      async searchFamilies(query) { const normalized = query.trim().toLowerCase(); return movementFamilies.filter(item => item.status === 'active' && (!normalized || [item.name, ...item.aliases].some(value => value.toLowerCase().includes(normalized)))).sort((a, b) => a.name.localeCompare(b.name)).map(clone); },
      async updateFamily(item) { const index = movementFamilies.findIndex(value => value.id === item.id); if (index >= 0) movementFamilies[index] = clone(item); },
      async assign(item) { const index = assignments.findIndex(value => value.exerciseId === item.exerciseId && value.movementFamilyId === item.movementFamilyId); if (index >= 0) assignments[index] = clone(item); else assignments.push(clone(item)); },
      async removeAssignment(exerciseId, movementFamilyId) { assignments = assignments.filter(item => item.exerciseId !== exerciseId || item.movementFamilyId !== movementFamilyId); },
      async assignmentsForExercise(exerciseId) { return assignments.filter(item => item.exerciseId === exerciseId).map(clone); },
      async familiesForExercise(exerciseId) { const ids = assignments.filter(item => item.exerciseId === exerciseId).map(item => item.movementFamilyId); return movementFamilies.filter(item => ids.includes(item.id) && item.status === 'active').map(clone); },
      async exercisesForFamily(familyId) { const ids = assignments.filter(item => item.movementFamilyId === familyId).map(item => item.exerciseId); return exercises.filter(item => ids.includes(item.id) && item.status === 'active').map(clone); },
      async familiesForMuscle(muscle) { return movementFamilies.filter(item => item.status === 'active' && [...item.primaryMuscles, ...item.secondaryMuscles].includes(muscle as never)).map(clone); },
      async createGroup(item) { requirementGroups.push(clone(item)); },
      async getGroup(id) { const item = requirementGroups.find(value => value.id === id); return item ? clone(item) : null; },
      async removeGroup(id) { requirementGroups = requirementGroups.filter(item => item.id !== id); equipmentRequirements = equipmentRequirements.filter(item => item.requirementGroupId !== id); },
      async groupsForExercise(exerciseId) { return requirementGroups.filter(item => item.exerciseId === exerciseId).sort((a, b) => a.priority - b.priority).map(clone); },
      async addRequirement(item) { const index = equipmentRequirements.findIndex(value => value.requirementGroupId === item.requirementGroupId && value.equipmentId === item.equipmentId); if (index >= 0) equipmentRequirements[index] = clone(item); else equipmentRequirements.push(clone(item)); },
      async getRequirement(id) { const item = equipmentRequirements.find(value => value.id === id); return item ? clone(item) : null; },
      async updateRequirement(item) { const index = equipmentRequirements.findIndex(value => value.id === item.id); if (index >= 0) equipmentRequirements[index] = clone(item); },
      async removeRequirement(id) { equipmentRequirements = equipmentRequirements.filter(item => item.id !== id); },
      async requirementsForGroup(groupId) { return equipmentRequirements.filter(item => item.requirementGroupId === groupId).sort((a, b) => a.createdAt - b.createdAt).map(clone); },
    },
    substitutions: { async create(item) { const duplicate = substitutions.find(value => value.sourceExerciseId === item.sourceExerciseId && value.targetExerciseId === item.targetExerciseId); if (duplicate) throw new Error('Duplicate directional substitution'); substitutions.push(clone(item)); }, async get(id) { const item = substitutions.find(value => value.id === id); return item ? clone(item) : null; }, async listForSource(id) { return substitutions.filter(item => item.sourceExerciseId === id && item.status === 'active').map(clone); }, async listToTarget(id) { return substitutions.filter(item => item.targetExerciseId === id && item.status === 'active').map(clone); }, async update(item) { const index = substitutions.findIndex(value => value.id === item.id); if (index >= 0) substitutions[index] = clone(item); } },
    users: {
      async create(user) { if (users.some(item => item.id === user.id)) return; users.push(clone(user)); },
      async get(id) { const user = users.find(item => item.id === id); return user ? clone(user) : null; },
      async list() { return users.filter(item => item.status === 'active').sort((a, b) => a.displayName.localeCompare(b.displayName)).map(clone); },
      async update(user) { const index = users.findIndex(item => item.id === user.id); if (index >= 0) users[index] = clone(user); },
    },
    gymExternalLinks: { async get(provider, externalPlaceId) { const item = gymExternalLinks.find(value => value.provider === provider && value.externalPlaceId === externalPlaceId); return item ? clone(item) : null; }, async create(link) { if (gymExternalLinks.some(value => value.provider === link.provider && value.externalPlaceId === link.externalPlaceId)) throw new Error('External place already linked'); gymExternalLinks.push(clone(link)); } },
    gymDiscoveryImport: { async import(gym, link) { if (gymExternalLinks.some(value => value.provider === link.provider && value.externalPlaceId === link.externalPlaceId)) throw new Error('External place already linked'); gyms = [...gyms, clone(gym)]; gymExternalLinks = [...gymExternalLinks, clone(link)]; } },
    userGyms: {
      async get(userId, gymId) { const item = userGyms.find(value => value.userId === userId && value.gymId === gymId); return item ? clone(item) : null; },
      async listByUser(userId) { return userGyms.filter(item => item.userId === userId).sort((a, b) => a.gymId.localeCompare(b.gymId)).map(clone); },
      async upsert(item) { const index = userGyms.findIndex(value => value.userId === item.userId && value.gymId === item.gymId); if (index >= 0) userGyms[index] = clone(item); else userGyms.push(clone(item)); },
      async delete(userId, gymId) { userGyms = userGyms.filter(item => item.userId !== userId || item.gymId !== gymId); },
      async setHome(item) { userGyms = userGyms.map(value => value.userId === item.userId && value.isHome && value.gymId !== item.gymId ? { ...value, isHome: false, updatedAt: Math.max(Date.now(), value.updatedAt + 1) } : value).filter(value => value.isHome || value.isFavorite || value.lastVisitedAt != null || value.membershipStatus != null || value.membershipStartedAt != null || value.membershipExpiresAt != null); const index = userGyms.findIndex(value => value.userId === item.userId && value.gymId === item.gymId); if (index >= 0) userGyms[index] = clone(item); else userGyms.push(clone(item)); },
      async clearHome(userId) { userGyms = userGyms.map(item => item.userId === userId && item.isHome ? { ...item, isHome: false, updatedAt: Math.max(Date.now(), item.updatedAt + 1) } : item).filter(item => item.isHome || item.isFavorite || item.lastVisitedAt != null || item.membershipStatus != null || item.membershipStartedAt != null || item.membershipExpiresAt != null); },
    },
    gymContexts: {
      async get(userId) { const context = gymContexts.find(item => item.userId === userId); return context ? clone(context) : null; },
      async set(context) { const index = gymContexts.findIndex(item => item.userId === context.userId); if (index >= 0) gymContexts[index] = clone(context); else gymContexts.push(clone(context)); },
      async clear(userId, updatedAt) { const index = gymContexts.findIndex(item => item.userId === userId); const context = { userId, currentGymId: null, selectedAt: null, updatedAt }; if (index >= 0) gymContexts[index] = context; else gymContexts.push(context); },
    },
  };
}
