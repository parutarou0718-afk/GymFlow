import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { createWebStore } from '../src/db/web-store';
import { exerciseDB } from '../src/lib/exercise-db';
import { createWorkoutService } from '../src/modules/workout';

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
