import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createUserService, type AuthenticatedPrincipal } from '../src/modules/user';
import { createProgramService } from '../src/modules/program';
import { createWorkoutService } from '../src/modules/workout';
import { createGymService } from '../src/modules/gym';
import { createGymContextService } from '../src/modules/gym-context';
import { createUserGymService } from '../src/modules/user-gym';
import { readFile } from 'node:fs/promises';
import { exerciseDB } from '../src/lib/exercise-db';

const principalA: AuthenticatedPrincipal = {
  provider: 'supabase',
  subject: 'auth-subject-a',
  email: 'a@example.test',
  displayName: 'Athlete A',
};

const principalB: AuthenticatedPrincipal = {
  provider: 'supabase',
  subject: 'auth-subject-b',
  email: 'b@example.test',
  displayName: 'Athlete B',
};

test('resolves the same authenticated principal to one stable Domain User', async () => {
  const users = createUserService(createWebStore());

  const first = await users.resolveAuthenticatedUser(principalA);
  const second = await users.resolveAuthenticatedUser(principalA);
  const other = await users.resolveAuthenticatedUser(principalB);

  assert.equal(first.id, second.id);
  assert.notEqual(first.id, other.id);
  assert.equal(first.authProvider, 'supabase');
  assert.equal(first.authSubject, 'auth-subject-a');
});

test('private Program and Workout detail reads are scoped to their owner', async () => {
  const store = createWebStore();
  const users = createUserService(store);
  const a = await users.resolveAuthenticatedUser(principalA);
  const b = await users.resolveAuthenticatedUser(principalB);
  const programs = createProgramService(store);
  const workouts = createWorkoutService(store);

  const programA = await programs.createProgramForOwner(a.id, { name: 'A only', exercises: [] });
  const workoutA = await workouts.startQuickWorkoutForOwner(a.id);

  assert.deepEqual((await programs.listProgramsForOwner(b.id)).map(program => program.id), []);
  assert.equal(await programs.getProgramForOwner(b.id, programA.id), null);
  assert.equal(await workouts.getWorkoutForOwner(b.id, workoutA.id), null);
  assert.deepEqual(await workouts.getWorkoutHistoryForOwner(b.id), []);
  assert.equal((await programs.getProgramForOwner(a.id, programA.id))?.ownerUserId, a.id);
  assert.equal((await workouts.getWorkoutForOwner(a.id, workoutA.id))?.ownerUserId, a.id);
});

test('Current Gym and User-Gym relationships remain isolated across authenticated identities', async () => {
  const store = createWebStore();
  const users = createUserService(store);
  const a = await users.resolveAuthenticatedUser(principalA);
  const b = await users.resolveAuthenticatedUser(principalB);
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const relationships = createUserGymService(store);
  const gymA = await gyms.createGym({ name: 'Gym A' });
  const gymB = await gyms.createGym({ name: 'Gym B' });

  await contexts.setCurrentGym(a.id, gymA.id);
  await contexts.setCurrentGym(b.id, gymB.id);
  await relationships.setHomeGym(a.id, gymA.id);
  await relationships.recordGymVisit(a.id, gymA.id, 1_000);
  await relationships.setHomeGym(b.id, gymB.id);
  await relationships.recordGymVisit(b.id, gymB.id, 2_000);

  assert.equal(await contexts.getCurrentGym(a.id), gymA.id);
  assert.equal(await contexts.getCurrentGym(b.id), gymB.id);
  assert.equal((await relationships.getHomeGym(a.id))?.gymId, gymA.id);
  assert.equal((await relationships.getHomeGym(b.id))?.gymId, gymB.id);
  assert.deepEqual((await relationships.getRecentGyms(a.id)).map(item => item.gymId), [gymA.id]);
  assert.deepEqual((await relationships.getRecentGyms(b.id)).map(item => item.gymId), [gymB.id]);
});

test('product runtime keeps Supabase and local-default identity out of business screens', async () => {
  const screenSources = await Promise.all([
    'app/(tabs)/index.tsx', 'app/(tabs)/current-gym.tsx', 'app/gym-detail.tsx', 'app/program-detail.tsx', 'app/replacement-review.tsx',
  ].map(path => readFile(path, 'utf8')));
  assert.equal(screenSources.some(source => source.includes('DEFAULT_LOCAL_USER_ID')), false);
  const modules = await Promise.all([
    'src/modules/program/program-service.ts', 'src/modules/workout/workout-service.ts', 'src/modules/gym-context/gym-context-service.ts', 'src/modules/social/social-service.ts',
  ].map(path => readFile(path, 'utf8')));
  assert.equal(modules.some(source => source.includes("from '@supabase") || source.includes('from "@supabase')), false);
});

test('private Workout runtime paths do not call unscoped detail or history APIs', async () => {
  const sources = await Promise.all([
    'src/hooks/useWorkoutEngine.ts', 'app/workout-complete.tsx', 'app/(tabs)/history.tsx', 'src/components/history/index.tsx',
  ].map(path => readFile(path, 'utf8')));
  assert.equal(sources.some(source => /\bgetWorkout\(|\bgetWorkoutHistoryDetail\(|\bgetWorkoutHistory\(/.test(source)), false);
});

test('a known active Workout ID cannot be loaded or mutated by another owner', async () => {
  const store = createWebStore();
  const users = createUserService(store);
  const a = await users.resolveAuthenticatedUser(principalA);
  const b = await users.resolveAuthenticatedUser(principalB);
  const workouts = createWorkoutService(store);
  const started = await workouts.startQuickWorkoutForOwner(a.id);
  const withExercise = await workouts.addExerciseForOwner(a.id, started.id, exerciseDB.getById('bench_press')!);
  const withSet = await workouts.addSetForOwner(a.id, started.id, withExercise.exercises[0].id);

  assert.equal(await workouts.getWorkoutForOwner(b.id, started.id), null);
  await assert.rejects(() => workouts.updateSetForOwner(b.id, started.id, withExercise.exercises[0].id, withSet.exercises[0].sets[0].setIndex, { reps: 99 }), /WORKOUT_NOT_FOUND/);
  await assert.rejects(() => workouts.finishWorkoutForOwner(b.id, started.id), /WORKOUT_NOT_FOUND/);
  const unchanged = await workouts.getWorkoutForOwner(a.id, started.id);
  assert.equal(unchanged?.status, 'active');
  assert.equal(unchanged?.exercises[0].sets[0].reps, 0);
  assert.equal((await store.events.getForSession(started.id)).some(event => event.eventType === 'WORKOUT_COMPLETED'), false);
  assert.deepEqual(await workouts.getWorkoutHistoryForOwner(b.id), []);
});

test('a completed Workout detail remains unavailable to another owner', async () => {
  const store = createWebStore();
  const users = createUserService(store);
  const a = await users.resolveAuthenticatedUser(principalA);
  const b = await users.resolveAuthenticatedUser(principalB);
  const workouts = createWorkoutService(store);
  const started = await workouts.startQuickWorkoutForOwner(a.id);

  await workouts.finishWorkoutForOwner(a.id, started.id);

  assert.equal(await workouts.getWorkoutHistoryDetailForOwner(b.id, started.id), null);
  assert.equal((await workouts.getWorkoutHistoryDetailForOwner(a.id, started.id))?.status, 'completed');
});
