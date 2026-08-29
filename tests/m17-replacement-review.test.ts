import assert from 'node:assert/strict';
import test from 'node:test';
import { createReplacementReviewService } from '../src/modules/replacement-review';
import type { ProgramGymMatchResult } from '../src/modules/program-matching';

const match: ProgramGymMatchResult = { programId: 'p', gymId: 'g', status: 'requires_adaptation', emptyProgram: false, summary: { totalExercises: 2, executable: 0, executableWithWarning: 0, notExecutable: 2, replaceable: 2, unresolved: 0 }, exercises: [
  { order: 0, exerciseId: 'x', originalProgramExercise: { id: 'entry-a', exerciseId: 'x', order: 0, targetSets: [] }, match: { exerciseId: 'x', gymId: 'g', status: 'not_executable', groupEvaluations: [], issues: [], alternatives: [{ exerciseId: 'a', compatibilityStatus: 'executable', candidateScore: 2, candidateSources: ['curated'], candidateReasons: ['curated_substitution'], selectedRequirementGroupId: null, issues: [] }, { exerciseId: 'b', compatibilityStatus: 'executable_with_warning', candidateScore: 1, candidateSources: ['same_family'], candidateReasons: ['same_movement_family'], selectedRequirementGroupId: null, issues: [] }] }, recommendedAlternativeExerciseId: 'a' },
  { order: 1, exerciseId: 'x', originalProgramExercise: { id: 'entry-b', exerciseId: 'x', order: 1, targetSets: [] }, match: { exerciseId: 'x', gymId: 'g', status: 'not_executable', groupEvaluations: [], issues: [], alternatives: [] }, recommendedAlternativeExerciseId: null },
] };

test('M17 keeps duplicate exercise entries independent and requires explicit selections', () => {
  const service = createReplacementReviewService(); const review = service.createReplacementReview({ matchResult: match, programUpdatedAt: 1 });
  assert.equal(review.status, 'blocked'); assert.equal(review.items[0].programExerciseKey, 'entry-a'); assert.equal(review.items[1].programExerciseKey, 'entry-b');
  const ready = service.selectReplacement({ review: { ...review, items: review.items.slice(0, 1), status: 'incomplete' }, programExerciseKey: 'entry-a', replacementExerciseId: 'b' });
  assert.equal(ready.status, 'ready'); assert.equal(ready.items[0].decision.status, 'selected'); assert.equal((ready.items[0].decision as any).replacementExerciseId, 'b');
  assert.throws(() => service.selectReplacement({ review: ready, programExerciseKey: 'entry-a', replacementExerciseId: 'not-a-candidate' }), /INVALID_REPLACEMENT/);
});

test('M17 can clear a selection and refuses incomplete or blocked reviews', () => {
  const service = createReplacementReviewService();
  const review = service.createReplacementReview({ matchResult: match, programUpdatedAt: 1 });
  const selectable = { ...review, items: review.items.slice(0, 1), status: 'incomplete' as const };
  const selected = service.selectReplacement({ review: selectable, programExerciseKey: 'entry-a', replacementExerciseId: 'a' });
  const cleared = service.clearReplacementSelection({ review: selected, programExerciseKey: 'entry-a' });

  assert.equal(cleared.status, 'incomplete');
  assert.throws(() => service.validateReplacementReview(cleared), /REVIEW_INCOMPLETE/);
  assert.throws(() => service.validateReplacementReview(review), /NO_REPLACEMENT_AVAILABLE/);
});
