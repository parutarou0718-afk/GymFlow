import { calculateVolume, generateId } from '../../lib/utils';
import { completeSession, pauseSession, resumeSession } from '../../lib/workout-lifecycle';
import type { CompletedSet, Exercise, SessionExercise, WorkoutReplacementReason, WorkoutSession, WorkoutSnapshot, WorkoutTemplate } from '../../types';
import type { WorkoutStore } from './ports';
import { createUserGymService } from '../user-gym';
import { createUserService, DEFAULT_LOCAL_USER_ID } from '../user';

type SetUpdate = { weight?: number; reps?: number; completed?: boolean };
export type ListCompletedWorkoutsOptions = { gymId?: string | null; limit?: number };
export type StartWorkoutOptions = { gymId?: string | null };
export type StartWorkoutFromTemplateInput = string | ({ templateId: string } & StartWorkoutOptions);
export interface ReplaceWorkoutExerciseInput {
  sessionId: string;
  sessionExerciseId: string;
  replacementExerciseId: string;
  reason: WorkoutReplacementReason;
  expectedCompletedSetCount: number;
}

export interface WorkoutService {
  startQuickWorkout(options?: StartWorkoutOptions): Promise<WorkoutSession>;
  startWorkoutFromTemplate(input: StartWorkoutFromTemplateInput): Promise<WorkoutSession>;
  getWorkout(sessionId: string): Promise<WorkoutSession | null>;
  getWorkoutShareSummary(sessionId: string): Promise<{ id: string; date: number; duration: number; exerciseCount: number; volume: number; gymId: string | null } | null>;
  getActiveWorkouts(): Promise<WorkoutSession[]>;
  pauseWorkout(sessionId: string): Promise<WorkoutSession>;
  resumeWorkout(sessionId: string): Promise<WorkoutSession>;
  finishWorkout(sessionId: string): Promise<WorkoutSession>;
  discardWorkout(sessionId: string): Promise<WorkoutSession>;
  addExercise(sessionId: string, exercise: Exercise): Promise<WorkoutSession>;
  removeExercise(sessionId: string, exerciseId: string): Promise<WorkoutSession>;
  addSet(sessionId: string, exerciseId: string): Promise<WorkoutSession>;
  removeSet(sessionId: string, exerciseId: string, setIndex: number): Promise<WorkoutSession>;
  updateSet(sessionId: string, exerciseId: string, setIndex: number, data: SetUpdate): Promise<WorkoutSession>;
  replaceWorkoutExercise(input: ReplaceWorkoutExerciseInput): Promise<WorkoutSession>;
  getWorkoutHistory(): Promise<WorkoutSession[]>;
  listCompletedWorkouts(options?: ListCompletedWorkoutsOptions): Promise<WorkoutSession[]>;
  getWorkoutHistoryDetail(sessionId: string): Promise<WorkoutSession | null>;
  getWorkoutStats(): Promise<{ workouts: number; volume: number }>;
  startQuickWorkoutForOwner(userId: string, options?: StartWorkoutOptions): Promise<WorkoutSession>;
  startWorkoutFromTemplateForOwner(userId: string, input: StartWorkoutFromTemplateInput): Promise<WorkoutSession>;
  getWorkoutForOwner(userId: string, sessionId: string): Promise<WorkoutSession | null>;
  getWorkoutHistoryForOwner(userId: string): Promise<WorkoutSession[]>;
  getActiveWorkoutsForOwner(userId: string): Promise<WorkoutSession[]>;
  getWorkoutStatsForOwner(userId: string): Promise<{ workouts: number; volume: number }>;
}

export function createWorkoutService(store: WorkoutStore): WorkoutService {
  const userGyms = createUserGymService(store);
  const getRequiredWorkout = async (sessionId: string): Promise<WorkoutSession> => {
    const session = await store.sessions.get(sessionId);
    if (!session) throw new Error(`Workout session not found: ${sessionId}`);
    return session;
  };

  const reload = (sessionId: string) => getRequiredWorkout(sessionId);

  const start = async (ownerUserId: string, template?: WorkoutTemplate, options?: StartWorkoutOptions): Promise<WorkoutSession> => {
    const active = await store.sessions.getActive();
    if (active) throw new Error(`An active workout already exists: ${active.id}`);
    const startedAt = Date.now();
    const owner = await createUserService(store).getUser(ownerUserId);
    if (!owner || owner.status !== 'active') throw new Error('USER_NOT_AVAILABLE');
    const session: WorkoutSession = {
      id: generateId(),
      ownerUserId,
      templateId: template?.id ?? null,
      templateName: template?.name ?? 'Quick Workout',
      status: 'active',
      startedAt,
      sourceType: template ? 'template' : 'quick',
      sourceId: template?.id ?? null,
      gymId: options?.gymId ?? null,
      visibility: 'private',
      pausedDuration: 0,
      exercises: (template?.exercises ?? []).map(item => ({
        id: generateId(),
        exerciseId: item.exerciseId,
        exercise: item.exercise,
        order: item.order,
        notes: item.notes,
        sets: item.targetSets.map((set, setIndex) => ({
          setIndex,
          weight: set.weight,
          reps: set.reps,
          completed: false,
        })),
      })),
    };

    await store.sessions.create(session);
    await store.events.record({
      id: generateId(), eventType: 'WORKOUT_STARTED', entityType: 'workout', entityId: session.id, createdAt: startedAt,
      payload: { sourceType: session.sourceType },
    });
    return session;
  };

  return {
    async startQuickWorkout(options) {
      const owner = await createUserService(store).getCurrentUser();
      return start(owner.id, undefined, options);
    },
    async startQuickWorkoutForOwner(userId, options) {
      return start(userId, undefined, options);
    },
    async startWorkoutFromTemplate(input) {
      const templateId = typeof input === 'string' ? input : input.templateId;
      const template = await store.templates.get(templateId);
      if (!template) throw new Error(`Workout template not found: ${templateId}`);
      const owner = await createUserService(store).getCurrentUser();
      return start(owner.id, template, typeof input === 'string' ? undefined : input);
    },
    async startWorkoutFromTemplateForOwner(userId, input) {
      const templateId = typeof input === 'string' ? input : input.templateId;
      const template = await store.templates.get(templateId);
      if (!template || template.ownerUserId !== userId) throw new Error('PROGRAM_NOT_FOUND');
      return start(userId, template, typeof input === 'string' ? undefined : input);
    },
    getWorkout: sessionId => store.sessions.get(sessionId),
    async getWorkoutForOwner(userId, sessionId) {
      const workout = await store.sessions.get(sessionId);
      return workout?.ownerUserId === userId ? workout : null;
    },
    async getWorkoutShareSummary(sessionId) {
      const session = await store.sessions.get(sessionId);
      return session ? { id: session.id, date: session.completedAt ?? session.startedAt, duration: session.duration ?? 0, exerciseCount: session.exercises.length, volume: session.totalVolume ?? 0, gymId: session.gymId ?? null } : null;
    },
    async getActiveWorkouts() {
      const active = await store.sessions.getActive();
      return active ? [active] : [];
    },
    async pauseWorkout(sessionId) {
      const session = await getRequiredWorkout(sessionId);
      const next = pauseSession(session, Date.now());
      if (next === session) return session;
      await store.sessions.updateStatus(sessionId, next.status, { pausedAt: next.pausedAt });
      await store.events.record({ id: generateId(), eventType: 'WORKOUT_PAUSED', entityType: 'workout', entityId: sessionId, createdAt: next.pausedAt!, payload: {} });
      return reload(sessionId);
    },
    async resumeWorkout(sessionId) {
      const session = await getRequiredWorkout(sessionId);
      const resumedAt = Date.now();
      const next = resumeSession(session, resumedAt);
      if (next === session) return session;
      await store.sessions.updateStatus(sessionId, next.status, { pausedAt: undefined, pausedDuration: next.pausedDuration });
      await store.events.record({ id: generateId(), eventType: 'WORKOUT_RESUMED', entityType: 'workout', entityId: sessionId, createdAt: resumedAt, payload: {} });
      return reload(sessionId);
    },
    async finishWorkout(sessionId) {
      const session = await getRequiredWorkout(sessionId);
      const completed = completeSession(session, Date.now(), session.startedAt);
      const totalVolume = calculateVolume(session.exercises.flatMap(exercise => exercise.sets));
      const snapshot: WorkoutSnapshot = {
        schemaVersion: 1,
        sessionId,
        planId: session.templateId,
        startedAt: session.startedAt,
        finishedAt: completed.completedAt ?? null,
        exercises: session.exercises.map(exercise => ({
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          sets: exercise.sets.map(set => ({ weight: set.weight, reps: set.reps, completed: set.completed })),
        })),
        totalVolume,
        duration: completed.duration ?? 0,
      };
      await store.workoutCompletion.complete({
        sessionId,
        completedAt: completed.completedAt!,
        duration: completed.duration ?? 0,
        pausedDuration: completed.pausedDuration ?? 0,
        totalVolume,
        snapshot,
        event: {
          id: generateId(),
          eventType: 'WORKOUT_COMPLETED',
          entityType: 'workout',
          entityId: sessionId,
          createdAt: completed.completedAt!,
          payload: { totalVolume },
        },
      });
      const persisted = await reload(sessionId);
      const completedGymId = persisted.gymId;
      if (completedGymId) {
        if (!persisted.ownerUserId) throw new Error('WORKOUT_OWNER_MISSING');
        await userGyms.recordGymVisit(persisted.ownerUserId, completedGymId, persisted.completedAt ?? Date.now());
      }
      return persisted;
    },
    async discardWorkout(sessionId) {
      await getRequiredWorkout(sessionId);
      const discardedAt = Date.now();
      await store.sessions.updateStatus(sessionId, 'discarded');
      await store.events.record({ id: generateId(), eventType: 'WORKOUT_DISCARDED', entityType: 'workout', entityId: sessionId, createdAt: discardedAt, payload: {} });
      return reload(sessionId);
    },
    async addExercise(sessionId, exercise) {
      const session = await getRequiredWorkout(sessionId);
      const item: SessionExercise = { id: generateId(), exerciseId: exercise.id, exercise, order: session.exercises.length, sets: [] };
      await store.sessions.addExercise(sessionId, item);
      return reload(sessionId);
    },
    async removeExercise(sessionId, exerciseId) {
      await getRequiredWorkout(sessionId);
      await store.sessions.removeExercise(sessionId, exerciseId);
      return reload(sessionId);
    },
    async addSet(sessionId, exerciseId) {
      const session = await getRequiredWorkout(sessionId);
      const exercise = session.exercises.find(item => item.id === exerciseId);
      if (!exercise) throw new Error(`Workout exercise not found: ${exerciseId}`);
      const set: CompletedSet = { setIndex: exercise.sets.length, weight: 0, reps: 0, completed: false };
      await store.sessions.addSet(exerciseId, set);
      return reload(sessionId);
    },
    async removeSet(sessionId, exerciseId, setIndex) {
      await getRequiredWorkout(sessionId);
      await store.sessions.removeSet(exerciseId, setIndex);
      return reload(sessionId);
    },
    async updateSet(sessionId, exerciseId, setIndex, data) {
      await getRequiredWorkout(sessionId);
      await store.sessions.updateSet(exerciseId, setIndex, data);
      return reload(sessionId);
    },
    async getActiveWorkoutsForOwner(userId) {
      const active = await store.sessions.getActive();
      return active?.ownerUserId === userId ? [active] : [];
    },
    async replaceWorkoutExercise(input) {
      const session = await getRequiredWorkout(input.sessionId);
      if (session.status !== 'active' && session.status !== 'paused') throw new Error('WORKOUT_NOT_ACTIVE');
      const exercise = session.exercises.find(item => item.id === input.sessionExerciseId);
      if (!exercise) throw new Error('WORKOUT_EXERCISE_NOT_FOUND');
      const completedSetCount = exercise.sets.filter(set => set.completed).length;
      if (completedSetCount !== input.expectedCompletedSetCount) throw new Error('REPLACEMENT_OPTIONS_CHANGED');
      if (exercise.sets.length > 0 && completedSetCount === exercise.sets.length) throw new Error('EXERCISE_ALREADY_COMPLETED');
      const occurredAt = Date.now();
      const replacementSessionExerciseId = completedSetCount === 0 ? exercise.id : generateId();
      await store.sessions.replaceExerciseAtomically({
        sessionId: session.id,
        sessionExerciseId: exercise.id,
        replacementExerciseId: input.replacementExerciseId,
        reason: input.reason,
        occurredAt,
        expectedCompletedSetCount: input.expectedCompletedSetCount,
        replacementSessionExerciseId,
        event: {
          id: generateId(),
          eventType: 'WORKOUT_EXERCISE_REPLACED',
          entityType: 'workout',
          entityId: session.id,
          createdAt: occurredAt,
          payload: {
            sessionId: session.id,
            originalSessionExerciseId: exercise.id,
            replacementSessionExerciseId,
            originalExerciseId: exercise.exerciseId,
            replacementExerciseId: input.replacementExerciseId,
            reason: input.reason,
            replacedAt: occurredAt,
          },
        },
      });
      return reload(session.id);
    },
    getWorkoutHistory: () => store.sessions.getAll(),
    async getWorkoutHistoryForOwner(userId) {
      return (await store.sessions.getAll()).filter(workout => workout.ownerUserId === userId);
    },
    async listCompletedWorkouts(options = {}) {
      if (options.limit != null && (!Number.isInteger(options.limit) || options.limit < 0)) throw new Error('Invalid workout limit');
      const completed = (await store.sessions.getAll()).filter(item => item.status === 'completed' && (options.gymId === undefined || item.gymId === options.gymId));
      completed.sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0) || right.startedAt - left.startedAt || left.id.localeCompare(right.id));
      return options.limit == null ? completed : completed.slice(0, options.limit);
    },
    getWorkoutHistoryDetail: sessionId => store.sessions.get(sessionId),
    async getWorkoutStats() {
      const [workouts, volume] = await Promise.all([
        store.sessions.getTotalWorkouts(),
        store.sessions.getTotalVolume(),
      ]);
      return { workouts, volume };
    },
    async getWorkoutStatsForOwner(userId) {
      const workouts = await store.sessions.getAll();
      const owned = workouts.filter(workout => workout.ownerUserId === userId);
      return { workouts: owned.length, volume: owned.reduce((total, workout) => total + (workout.totalVolume ?? 0), 0) };
    },
  };
}
