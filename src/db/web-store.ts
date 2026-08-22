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
  };
}
