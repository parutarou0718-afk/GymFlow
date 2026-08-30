import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { createWebStore } from '../src/db/web-store';
import { exerciseDB } from '../src/lib/exercise-db';
import { createWorkoutService } from '../src/modules/workout';
import { createGymService } from '../src/modules/gym';
import { createUserGymService } from '../src/modules/user-gym';
import { DEFAULT_LOCAL_USER_ID } from '../src/modules/user';

test('WorkoutService creates, edits, restores, and completes a quick workout through GymFlowStore', async () => {
  const store = createWebStore();
  const service = createWorkoutService(store);
  const benchPress = exerciseDB.getById('bench_press')!;

  const started = await service.startQuickWorkout();
  const withExercise = await service.addExercise(started.id, benchPress);
  const withSet = await service.addSet(started.id, withExercise.exercises[0].id);
  const edited = await service.updateSet(started.id, withExercise.exercises[0].id, withSet.exercises[0].sets[0].setIndex, { weight: 60, reps: 8, completed: true });

  assert.equal(edited.sourceType, 'quick');
  assert.deepEqual((await service.getWorkout(started.id))?.exercises[0].sets[0], { setIndex: 0, weight: 60, reps: 8, completed: true });

  const completed = await service.finishWorkout(started.id);
  assert.equal(completed.status, 'completed');
  assert.equal((await service.getWorkoutHistoryDetail(started.id))?.id, started.id);
  assert.equal((await store.events.getForSession(started.id)).filter(event => event.eventType === 'WORKOUT_COMPLETED').length, 1);
});

test('Workout start accepts optional gymId without changing the default null behavior', async () => {
  const service = createWorkoutService(createWebStore());
  assert.equal((await service.startQuickWorkout()).gymId, null);
  const scopedService = createWorkoutService(createWebStore());
  assert.equal((await scopedService.startQuickWorkout({ gymId: 'gym-current' })).gymId, 'gym-current');
});

test('M18 replaces a zero-completed workout exercise in place with reset weight and provenance', async () => {
  const store = createWebStore();
  const workout = createWorkoutService(store);
  const started = await workout.startQuickWorkout();
  const bench = exerciseDB.getById('bench_press')!;
  const original = await workout.addExercise(started.id, bench);
  const entryId = original.exercises[0].id;
  await workout.addSet(started.id, entryId);
  await workout.addSet(started.id, entryId);
  await workout.updateSet(started.id, entryId, 0, { weight: 80, reps: 8 });
  await workout.updateSet(started.id, entryId, 1, { weight: 75, reps: 10 });

  const replaced = await workout.replaceWorkoutExercise({
    sessionId: started.id,
    sessionExerciseId: entryId,
    replacementExerciseId: 'dumbbell_bench_press',
    reason: 'equipment_occupied',
    expectedCompletedSetCount: 0,
  });

  assert.equal(replaced.exercises.length, 1);
  assert.equal(replaced.exercises[0].id, entryId);
  assert.equal(replaced.exercises[0].exerciseId, 'dumbbell_bench_press');
  assert.deepEqual(replaced.exercises[0].sets, [
    { setIndex: 0, weight: 0, reps: 8, completed: false },
    { setIndex: 1, weight: 0, reps: 10, completed: false },
  ]);
  assert.equal(replaced.exercises[0].replacedFromExerciseId, 'bench_press');
  assert.equal(replaced.exercises[0].replacementReason, 'equipment_occupied');
  assert.equal((await store.events.getForSession(started.id)).filter(event => event.eventType === 'WORKOUT_EXERCISE_REPLACED').length, 1);
});

test('M18 splits a partially completed workout exercise and preserves completed history', async () => {
  const workout = createWorkoutService(createWebStore());
  const started = await workout.startQuickWorkout();
  const original = await workout.addExercise(started.id, exerciseDB.getById('bench_press')!);
  const entryId = original.exercises[0].id;
  for (let index = 0; index < 4; index += 1) await workout.addSet(started.id, entryId);
  await workout.updateSet(started.id, entryId, 0, { weight: 80, reps: 8, completed: true });
  await workout.updateSet(started.id, entryId, 1, { weight: 80, reps: 8, completed: true });
  await workout.updateSet(started.id, entryId, 2, { weight: 75, reps: 10 });
  await workout.updateSet(started.id, entryId, 3, { weight: 75, reps: 10 });

  const replaced = await workout.replaceWorkoutExercise({
    sessionId: started.id,
    sessionExerciseId: entryId,
    replacementExerciseId: 'dumbbell_bench_press',
    reason: 'equipment_unavailable',
    expectedCompletedSetCount: 2,
  });

  assert.equal(replaced.exercises.length, 2);
  assert.deepEqual(replaced.exercises[0].sets, [
    { setIndex: 0, weight: 80, reps: 8, completed: true },
    { setIndex: 1, weight: 80, reps: 8, completed: true },
  ]);
  assert.equal(replaced.exercises[1].exerciseId, 'dumbbell_bench_press');
  assert.equal(replaced.exercises[1].order, 1);
  assert.deepEqual(replaced.exercises[1].sets, [
    { setIndex: 0, weight: 0, reps: 10, completed: false },
    { setIndex: 1, weight: 0, reps: 10, completed: false },
  ]);
  assert.equal(replaced.exercises[1].replacedFromExerciseId, 'bench_press');
});

test('M18 rejects completed and stale entries without changing the Workout', async () => {
  const workout = createWorkoutService(createWebStore());
  const started = await workout.startQuickWorkout();
  const added = await workout.addExercise(started.id, exerciseDB.getById('bench_press')!);
  const entryId = added.exercises[0].id;
  await workout.addSet(started.id, entryId);
  await workout.updateSet(started.id, entryId, 0, { reps: 8, completed: true });
  const beforeCompleted = await workout.getWorkout(started.id);
  await assert.rejects(() => workout.replaceWorkoutExercise({ sessionId: started.id, sessionExerciseId: entryId, replacementExerciseId: 'dumbbell_bench_press', reason: 'other', expectedCompletedSetCount: 1 }), /EXERCISE_ALREADY_COMPLETED/);
  assert.deepEqual(await workout.getWorkout(started.id), beforeCompleted);

  const second = await workout.addExercise(started.id, exerciseDB.getById('incline_bench_press')!);
  const secondId = second.exercises[1].id;
  await workout.addSet(started.id, secondId);
  await workout.updateSet(started.id, secondId, 0, { completed: true });
  const beforeStale = await workout.getWorkout(started.id);
  await assert.rejects(() => workout.replaceWorkoutExercise({ sessionId: started.id, sessionExerciseId: secondId, replacementExerciseId: 'dumbbell_bench_press', reason: 'other', expectedCompletedSetCount: 0 }), /REPLACEMENT_OPTIONS_CHANGED/);
  assert.deepEqual(await workout.getWorkout(started.id), beforeStale);
});

test('completing a workout at a Gym records one Gym Visit after completion persists', async () => {
  const store = createWebStore();
  const gym = await createGymService(store).createGym({ name: 'Visit Gym' });
  const workout = createWorkoutService(store);
  const started = await workout.startQuickWorkout({ gymId: gym.id });

  const completed = await workout.finishWorkout(started.id);
  const relationship = await createUserGymService(store).getUserGymRelationship(DEFAULT_LOCAL_USER_ID, gym.id);

  assert.equal(relationship?.lastVisitedAt, completed.completedAt);
});

for (const failureStage of ['session', 'snapshot', 'event'] as const) {
  test(`WorkoutService leaves no partial completion when atomic ${failureStage} persistence fails`, async () => {
    const store = createWebStore() as ReturnType<typeof createWebStore> & {
      workoutCompletion: { complete: () => Promise<void> };
    };
    const service = createWorkoutService(store);
    const started = await service.startQuickWorkout();
    store.workoutCompletion = {
      complete: async () => {
        throw new Error(`${failureStage} persistence failed`);
      },
    };

    await assert.rejects(() => service.finishWorkout(started.id), /persistence failed/);

    assert.equal((await service.getWorkout(started.id))?.status, 'active');
    assert.equal((await service.getWorkoutHistory()).some(item => item.id === started.id), false);
    assert.equal((await store.sync.getPending()).some(item => item.sessionId === started.id), false);
    assert.equal((await store.events.getForSession(started.id)).some(event => event.eventType === 'WORKOUT_COMPLETED'), false);
  });
}

test('useWorkoutEngine coordinates through the Workout module public API', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/hooks/useWorkoutEngine.ts'), 'utf8');

  assert.match(source, /createWorkoutService/);
  assert.doesNotMatch(source, /from ['"]\.\.\/lib\/workout-lifecycle['"]/);
  assert.doesNotMatch(source, /\{ sessions, sync, events \} = useStores/);
});
