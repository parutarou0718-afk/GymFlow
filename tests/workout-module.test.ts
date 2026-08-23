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
