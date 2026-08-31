import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('M21 Replacement Review resolves names through public APIs and requires explicit selection', async () => {
  const source = await readFile(resolve(process.cwd(), 'app/replacement-review.tsx'), 'utf8');

  assert.match(source, /createExerciseService\(store\)/);
  assert.match(source, /createEquipmentService\(store\)/);
  assert.match(source, /presentReplacementReviewItem/);
  assert.match(source, /Use this/);
  assert.doesNotMatch(source, /store\.(?:sessions|templates|gyms|equipment|exercises|inventory)/);
  assert.doesNotMatch(source, /setReview\([^\n]*options\[0\]/);
  assert.doesNotMatch(source, /originalExerciseId}\</);
  assert.doesNotMatch(source, /option\.exerciseId}\</);
});
