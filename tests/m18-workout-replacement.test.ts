import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkoutReplacementService } from '../src/modules/workout-replacement';

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
