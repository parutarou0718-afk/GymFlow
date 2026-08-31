import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('M21 Active Workout presents session Gym and replacement through public services', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/components/session/ActiveWorkout.tsx'), 'utf8');
  const block = await readFile(resolve(process.cwd(), 'src/components/session/ExerciseBlock.tsx'), 'utf8');

  assert.match(source, /createGymService\(store\)/);
  assert.match(source, /Training at/);
  assert.match(source, /No training location/);
  assert.match(source, /Training location unavailable/);
  assert.match(source, /Equipment is occupied/);
  assert.match(source, /No suitable replacement is available at this Gym/);
  assert.match(source, /Completed sets will stay with/);
  assert.doesNotMatch(source, /store\.(?:sessions|sessionExercises|workoutEvents|gymInventory)/);
  assert.match(block, /completedCount < exercise\.sets\.length/);
});
