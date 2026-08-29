import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';
import { createWorkoutService } from '../src/modules/workout';

test('Workout public API filters completed history by Gym in newest-first order', async () => {
  const store = createWebStore();
  const gyms = createGymService(store);
  const workouts = createWorkoutService(store);
  const [a, b] = await Promise.all([gyms.createGym({ name: 'A' }), gyms.createGym({ name: 'B' })]);
  const first = await workouts.startQuickWorkout({ gymId: a.id });
  await workouts.finishWorkout(first.id);
  const second = await workouts.startQuickWorkout({ gymId: b.id });
  await workouts.finishWorkout(second.id);

  const result = await workouts.listCompletedWorkouts({ gymId: a.id, limit: 1 });
  assert.deepEqual(result.map(item => item.id), [first.id]);
});

test('M16 screens obtain Gym, Program, Workout and user relationship data through public APIs', async () => {
  const files = ['app/(tabs)/index.tsx', 'app/gym-detail.tsx', 'app/program-detail.tsx', 'app/session-detail.tsx', 'src/components/gym/GymPicker.tsx'];
  for (const file of files) {
    const source = await readFile(resolve(process.cwd(), file), 'utf8');
    assert.doesNotMatch(source, /store\.(sessions|templates|gyms|userGyms)/);
  }
});

test('M16 History resolves session Gym names through the Gym public API', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/components/history/index.tsx'), 'utf8');
  assert.match(source, /createGymService/);
  assert.match(source, /gymNames/);
});
