import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkoutReplacementService } from '../src/modules/workout-replacement';
import { createWebStore } from '../src/db/web-store';
import { createWorkoutService } from '../src/modules/workout';
import { createGymService } from '../src/modules/gym';
import { createGymContextService } from '../src/modules/gym-context';
import { createUserGymService } from '../src/modules/user-gym';
import { createInventoryService } from '../src/modules/gym-inventory';
import { DEFAULT_LOCAL_USER_ID } from '../src/modules/user';
import { exerciseDB } from '../src/lib/exercise-db';

const session: any = {
  id: 'session-a', status: 'active', gymId: 'gym-a', exercises: [
    { id: 'entry-a', exerciseId: 'bench_press', order: 0, sets: [{ setIndex: 0, weight: 80, reps: 8, completed: false }] },
  ],
};

test('M18 options use the Workout session Gym, preserve candidate order, and allow an executable non-top selection', async () => {
  let replacement: any;
  const service = createWorkoutReplacementService({
    workouts: {
      getWorkout: async () => structuredClone(session),
      replaceWorkoutExercise: async (input: any) => { replacement = input; return structuredClone(session); },
    },
    candidates: { resolveExerciseCandidates: async () => [
      { exerciseId: 'first', sources: ['curated'], score: 3, reasons: ['curated_substitution'] },
      { exerciseId: 'second', sources: ['same_family'], score: 2, reasons: ['same_movement_family'] },
      { exerciseId: 'blocked', sources: ['same_family'], score: 1, reasons: ['same_movement_family'] },
    ] },
    matching: { matchExerciseToGym: async ({ exerciseId }: any) => ({ status: exerciseId === 'blocked' ? 'not_executable' : exerciseId === 'second' ? 'executable_with_warning' : 'executable', issues: [] }) },
    exercises: { getExercise: async (id: string) => ({ id, name: id, status: 'active' }) },
  } as any);

  const options = await service.getWorkoutReplacementOptions({ sessionId: 'session-a', sessionExerciseId: 'entry-a' });
  assert.equal(options.gymId, 'gym-a');
  assert.deepEqual(options.options.map((option: any) => option.exerciseId), ['first', 'second']);
  assert.equal(options.options[1].gymStatus, 'executable_with_warning');

  await service.replaceExercise({ sessionId: 'session-a', sessionExerciseId: 'entry-a', replacementExerciseId: 'second', reason: 'other', expectedCompletedSetCount: options.completedSetCount });
  assert.equal(replacement.replacementExerciseId, 'second');
  assert.equal(replacement.reason, 'other');
});

test('M18 allows unverified candidate options for a Workout without a Gym', async () => {
  const service = createWorkoutReplacementService({
    workouts: { getWorkout: async () => ({ ...session, gymId: null }), replaceWorkoutExercise: async () => ({ ...session, gymId: null }) },
    candidates: { resolveExerciseCandidates: async () => [{ exerciseId: 'second', sources: [], score: 2, reasons: [] }] },
    matching: { matchExerciseToGym: async () => { throw new Error('must not use Gym matching'); } },
    exercises: { getExercise: async (id: string) => ({ id, name: id, status: 'active' }) },
  } as any);
  const options = await service.getWorkoutReplacementOptions({ sessionId: 'session-a', sessionExerciseId: 'entry-a' });
  assert.equal(options.gymValidation, 'not_available');
  assert.equal(options.options[0].exerciseId, 'second');
});

test('M21 Slice 4 keeps Workout replacement scoped to the session Gym after Current Gym changes', async () => {
  const store = createWebStore();
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const workouts = createWorkoutService(store);
  const [gymA, gymB] = await Promise.all([gyms.createGym({ name: 'Gym A' }), gyms.createGym({ name: 'Gym B' })]);
  const session = await workouts.startQuickWorkout({ gymId: gymA.id });
  const withExercise = await workouts.addExercise(session.id, exerciseDB.getById('bench_press')!);
  const entry = withExercise.exercises[0];
  await workouts.addSet(session.id, entry.id);
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymB.id);
  const matchedGyms: string[] = [];
  const service = createWorkoutReplacementService({
    workouts,
    candidates: { resolveExerciseCandidates: async () => [{ exerciseId: 'dumbbell_bench_press', sources: ['curated'], score: 1, reasons: ['curated_substitution'] }] },
    matching: { matchExerciseToGym: async ({ gymId }: any) => { matchedGyms.push(gymId); return { status: 'executable', issues: [] }; } },
    exercises: { getExercise: async (id: string) => ({ id, name: 'Dumbbell Bench Press', status: 'active' }) },
  } as any);

  const options = await service.getWorkoutReplacementOptions({ sessionId: session.id, sessionExerciseId: entry.id });
  const replaced = await service.replaceExercise({ sessionId: session.id, sessionExerciseId: entry.id, replacementExerciseId: 'dumbbell_bench_press', reason: 'equipment_occupied', expectedCompletedSetCount: 0 });

  assert.equal(await contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID), gymB.id);
  assert.deepEqual(matchedGyms, [gymA.id, gymA.id]);
  assert.equal(options.gymId, gymA.id);
  assert.equal(replaced.gymId, gymA.id);
});

test('M21 Slice 4 treats equipment occupied as a Workout-only reason without changing Inventory', async () => {
  const store = createWebStore();
  const workouts = createWorkoutService(store);
  const inventory = createInventoryService(store);
  const gym = await createGymService(store).createGym({ name: 'Inventory Gym' });
  const session = await workouts.startQuickWorkout({ gymId: gym.id });
  const withExercise = await workouts.addExercise(session.id, exerciseDB.getById('bench_press')!);
  const entry = withExercise.exercises[0];
  await workouts.addSet(session.id, entry.id);
  const before = await inventory.getGymEquipment(gym.id);

  await workouts.replaceWorkoutExercise({ sessionId: session.id, sessionExerciseId: entry.id, replacementExerciseId: 'dumbbell_bench_press', reason: 'equipment_occupied', expectedCompletedSetCount: 0 });

  assert.deepEqual(await inventory.getGymEquipment(gym.id), before);
});
