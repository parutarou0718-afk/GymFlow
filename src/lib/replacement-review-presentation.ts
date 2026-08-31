import type { CompatibilityIssue } from '../modules/matching';
import type { ReplacementReviewItem } from '../modules/replacement-review';

export interface ReplacementReviewNames {
  gymName: string;
  exercises: Record<string, string>;
  equipment: Record<string, string>;
}

const equipmentName = (issue: CompatibilityIssue, names: ReplacementReviewNames) => issue.equipmentId ? names.equipment[issue.equipmentId] ?? null : null;

export function presentReplacementIssue(issue: CompatibilityIssue, names: ReplacementReviewNames): string {
  const equipment = equipmentName(issue, names);
  switch (issue.code) {
    case 'missing_required_equipment': return equipment ? `${names.gymName} doesn’t have ${equipment}.` : 'Required equipment is unavailable.';
    case 'equipment_unavailable': return equipment ? `${equipment} is not available here.` : 'Required equipment is unavailable.';
    case 'equipment_availability_unknown': return equipment ? `Availability for ${equipment} is unknown.` : 'Availability for the required equipment is unknown.';
    case 'insufficient_capability': return equipment ? `This ${equipment} does not support the required setup.` : 'Available equipment does not support the required setup.';
    case 'unknown_capability': return equipment ? `GymFlow cannot confirm whether this ${equipment} supports the required setup.` : 'GymFlow cannot confirm whether the required equipment supports the required setup.';
    case 'missing_preferred_equipment': return equipment ? `This Program can still run, but the preferred ${equipment} is unavailable.` : 'This Program can still run, but preferred equipment is unavailable.';
    default: return 'Required equipment is unavailable.';
  }
}

const presentCandidateSource = (sources: string[]) => {
  if (sources.includes('curated')) return 'A closely matched alternative';
  if (sources.includes('same_family')) return 'Works the same muscle pattern';
  return 'A suitable alternative for this Gym';
};

export function presentReplacementReviewItem(item: ReplacementReviewItem, names: ReplacementReviewNames) {
  return {
    originalExerciseName: names.exercises[item.originalExerciseId] ?? 'Exercise unavailable',
    selectedExerciseId: item.decision.status === 'selected' ? item.decision.replacementExerciseId : null,
    options: item.options.map((option, index) => ({
      exerciseId: option.exerciseId,
      name: names.exercises[option.exerciseId] ?? 'Exercise unavailable',
      isRecommended: index === 0,
      reason: presentCandidateSource(option.sources),
      hasAvailabilityWarning: option.gymStatus === 'executable_with_warning',
    })),
  };
}
