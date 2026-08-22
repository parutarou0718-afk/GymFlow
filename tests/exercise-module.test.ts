import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createExerciseService } from '../src/modules/exercise';

test('Exercise Master preserves legacy IDs, searches aliases, and archives without losing direct reads', async () => {
  const service = createExerciseService(createWebStore());
  const bench = await service.getExercise('bench_press');
  assert.equal(bench?.id, 'bench_press');

  const created = await service.createExercise({ name: 'Cable Lateral Raise', aliases: ['绳索侧平举'], category: 'isolation', movementPattern: 'vertical_push', primaryMuscles: ['side_delts'], secondaryMuscles: ['front_delts'] });
  assert.equal((await service.searchExercises('绳索'))[0].id, created.id);
  assert.equal((await service.updateExercise(created.id, { notes: 'Use a low pulley.' })).notes, 'Use a low pulley.');
  await service.archiveExercise(created.id);
  assert.equal((await service.searchExercises('绳索')).length, 0);
  assert.equal((await service.getExercise(created.id))?.status, 'archived');
});
