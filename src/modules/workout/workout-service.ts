import { calculateVolume, generateId } from '../../lib/utils';
import { completeSession, pauseSession, resumeSession } from '../../lib/workout-lifecycle';
import type { CompletedSet, Exercise, SessionExercise, WorkoutSession, WorkoutSnapshot, WorkoutTemplate } from '../../types';
import type { WorkoutStore } from './ports';
import { createUserGymService } from '../user-gym';
import { DEFAULT_LOCAL_USER_ID } from '../user';

type SetUpdate = { weight?: number; reps?: number; completed?: boolean };
export type StartWorkoutOptions = { gymId?: string | null };
export type StartWorkoutFromTemplateInput = string | ({ templateId: string } & StartWorkoutOptions);

export interface WorkoutService {
  startQuickWorkout(options?: StartWorkoutOptions): Promise<WorkoutSession>;
  startWorkoutFromTemplate(input: StartWorkoutFromTemplateInput): Promise<WorkoutSession>;
  getWorkout(sessionId: string): Promise<WorkoutSession | null>;
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
  getWorkoutHistory(): Promise<WorkoutSession[]>;
  getWorkoutHistoryDetail(sessionId: string): Promise<WorkoutSession | null>;
  getWorkoutStats(): Promise<{ workouts: number; volume: number }>;
}

export function createWorkoutService(store: WorkoutStore): WorkoutService {
  const userGyms = createUserGymService(store);
  const getRequiredWorkout = async (sessionId: string): Promise<WorkoutSession> => {
    const session = await store.sessions.get(sessionId);
    if (!session) throw new Error(`Workout session not found: ${sessionId}`);
    return session;
  };

  const reload = (sessionId: string) => getRequiredWorkout(sessionId);

  const start = async (template?: WorkoutTemplate, options?: StartWorkoutOptions): Promise<WorkoutSession> => {
    const active = await store.sessions.getActive();
    if (active) throw new Error(`An active workout already exists: ${active.id}`);
    const startedAt = Date.now();
    const session: WorkoutSession = {
      id: generateId(),
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
    startQuickWorkout: options => start(undefined, options),
    async startWorkoutFromTemplate(input) {
      const templateId = typeof input === 'string' ? input : input.templateId;
      const template = await store.templates.get(templateId);
      if (!template) throw new Error(`Workout template not found: ${templateId}`);
      return start(template, typeof input === 'string' ? undefined : input);
    },
    getWorkout: sessionId => store.sessions.get(sessionId),
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
      if (persisted.gymId) {
        await userGyms.recordGymVisit(DEFAULT_LOCAL_USER_ID, persisted.gymId, persisted.completedAt);
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
    getWorkoutHistory: () => store.sessions.getAll(),
    getWorkoutHistoryDetail: sessionId => store.sessions.get(sessionId),
    async getWorkoutStats() {
      const [workouts, volume] = await Promise.all([
        store.sessions.getTotalWorkouts(),
        store.sessions.getTotalVolume(),
      ]);
      return { workouts, volume };
    },
  };
}
