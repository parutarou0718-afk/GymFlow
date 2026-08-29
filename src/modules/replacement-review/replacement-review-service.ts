import type { ProgramGymMatchResult } from '../program-matching';
import type { ReplacementReview, ReplacementReviewItem } from './types';

const deriveStatus = (items: ReplacementReviewItem[]): ReplacementReview['status'] => {
  if (items.some((item) => item.decision.status === 'unresolved')) return 'blocked';
  if (items.some((item) => item.decision.status === 'pending')) return 'incomplete';
  return 'ready';
};

export function createReplacementReviewService() {
  const updateItem = (
    review: ReplacementReview,
    programExerciseKey: string,
    update: (item: ReplacementReviewItem) => ReplacementReviewItem,
  ): ReplacementReview => {
    let found = false;
    const items = review.items.map((item) => {
      if (item.programExerciseKey !== programExerciseKey) return item;
      found = true;
      return update(item);
    });
    if (!found) throw new Error('INVALID_REPLACEMENT');
    return { ...review, items, status: deriveStatus(items) };
  };

  return {
    createReplacementReview({ matchResult, programUpdatedAt }: { matchResult: ProgramGymMatchResult; programUpdatedAt: number }): ReplacementReview {
      const items = matchResult.exercises.filter((entry) => entry.match.status === 'not_executable').map((entry) => {
        const options = entry.match.alternatives
          .filter((candidate) => candidate.compatibilityStatus === 'executable' || candidate.compatibilityStatus === 'executable_with_warning')
          .map((candidate) => ({ exerciseId: candidate.exerciseId, quality: null, score: candidate.candidateScore, sources: candidate.candidateSources, reasonCodes: candidate.candidateReasons, gymStatus: candidate.compatibilityStatus as 'executable' | 'executable_with_warning' }));
        return { programExerciseKey: entry.originalProgramExercise.id, originalExerciseId: entry.exerciseId, options, decision: options.length ? { status: 'pending' as const } : { status: 'unresolved' as const } };
      });
      return { programId: matchResult.programId, gymId: matchResult.gymId, programUpdatedAt, matchResult, items, status: deriveStatus(items) };
    },

    selectReplacement({ review, programExerciseKey, replacementExerciseId }: { review: ReplacementReview; programExerciseKey: string; replacementExerciseId: string }): ReplacementReview {
      return updateItem(review, programExerciseKey, (item) => {
        if (!item.options.some((option) => option.exerciseId === replacementExerciseId)) throw new Error('INVALID_REPLACEMENT');
        return { ...item, decision: { status: 'selected', replacementExerciseId } };
      });
    },

    clearReplacementSelection({ review, programExerciseKey }: { review: ReplacementReview; programExerciseKey: string }): ReplacementReview {
      return updateItem(review, programExerciseKey, (item) => {
        if (item.options.length === 0) throw new Error('NO_REPLACEMENT_AVAILABLE');
        return { ...item, decision: { status: 'pending' } };
      });
    },

    validateReplacementReview(review: ReplacementReview): ReplacementReview {
      if (review.status === 'blocked') throw new Error('NO_REPLACEMENT_AVAILABLE');
      if (review.status !== 'ready') throw new Error('REVIEW_INCOMPLETE');
      return review;
    },
  };
}
