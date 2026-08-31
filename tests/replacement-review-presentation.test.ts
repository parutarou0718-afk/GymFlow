import assert from 'node:assert/strict';
import test from 'node:test';
import { presentReplacementIssue, presentReplacementReviewItem } from '../src/lib/replacement-review-presentation';
import type { ReplacementReviewItem } from '../src/modules/replacement-review';

const names = { gymName: 'Gym A', exercises: { source: 'Barbell Bench Press', recommended: 'Dumbbell Bench Press', alternative: 'Push-up' }, equipment: { barbell: 'Barbell', cable: 'Cable station' } };

test('Replacement Review presentation maps each equipment evidence fact without overstating it', () => {
  assert.equal(presentReplacementIssue({ code: 'missing_required_equipment', equipmentId: 'barbell' }, names), 'Gym A doesn’t have Barbell.');
  assert.equal(presentReplacementIssue({ code: 'equipment_unavailable', equipmentId: 'barbell' }, names), 'Barbell is not available here.');
  assert.equal(presentReplacementIssue({ code: 'equipment_availability_unknown', equipmentId: 'barbell' }, names), 'Availability for Barbell is unknown.');
  assert.equal(presentReplacementIssue({ code: 'insufficient_capability', equipmentId: 'cable' }, names), 'This Cable station does not support the required setup.');
  assert.equal(presentReplacementIssue({ code: 'missing_preferred_equipment', equipmentId: 'barbell' }, names), 'This Program can still run, but the preferred Barbell is unavailable.');
  assert.equal(presentReplacementIssue({ code: 'missing_required_equipment' }, { gymName: 'Gym A', exercises: {}, equipment: {} }), 'Required equipment is unavailable.');
  assert.equal(presentReplacementIssue({ code: 'equipment_availability_unknown' }, { gymName: 'Gym A', exercises: {}, equipment: {} }), 'Availability for the required equipment is unknown.');
});

test('Replacement Review presentation marks but does not select the recommended candidate', () => {
  const item: ReplacementReviewItem = {
    programExerciseKey: 'entry', originalExerciseId: 'source',
    options: [
      { exerciseId: 'recommended', quality: null, score: 1, sources: ['curated'], reasonCodes: ['curated_substitution'], gymStatus: 'executable' },
      { exerciseId: 'alternative', quality: null, score: 0.5, sources: ['same_family'], reasonCodes: ['same_movement_family'], gymStatus: 'executable_with_warning' },
    ],
    decision: { status: 'pending' },
  };

  const presented = presentReplacementReviewItem(item, names);

  assert.equal(presented.originalExerciseName, 'Barbell Bench Press');
  assert.equal(presented.selectedExerciseId, null);
  assert.equal(presented.options[0].isRecommended, true);
  assert.equal(presented.options[1].isRecommended, false);
  assert.equal(presented.options[0].reason, 'A closely matched alternative');
  assert.equal(presented.options[1].reason, 'Works the same muscle pattern');
  assert.doesNotMatch(presented.options.map(option => option.reason).join(' '), /curated_substitution|same_movement_family/);
});
