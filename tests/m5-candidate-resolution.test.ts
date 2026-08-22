import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createExerciseSubstitutionService } from '../src/modules/exercise-substitution';
import { createCandidateResolutionService } from '../src/modules/candidate-resolution';

test('M5 keeps substitutions directional and resolves merged deterministic candidates', async () => {
  const store = createWebStore();
  const substitutions = createExerciseSubstitutionService(store);
  const resolver = createCandidateResolutionService(store);
  await substitutions.createSubstitution({ sourceExerciseId: 'hack_squat', targetExerciseId: 'leg_extension', quality: 'good', reason: 'Similar quad-focused machine pattern' });
  assert.equal((await substitutions.listSubstitutionsForSource('leg_extension')).some(item => item.targetExerciseId === 'hack_squat'), false);
  const candidates = await resolver.resolveExerciseCandidates({ exerciseId: 'hack_squat', limit: 10, minimumScore: 0 });
  const legPress = candidates.find(item => item.exerciseId === 'leg_press');
  assert.ok(legPress);
  assert.ok(legPress.sources.includes('curated'));
  assert.equal(legPress.quality, 'good');
  await assert.rejects(() => substitutions.createSubstitution({ sourceExerciseId: 'hack_squat', targetExerciseId: 'hack_squat', quality: 'good' }));
});
