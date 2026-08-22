import type { GymAwareExerciseAlternative } from './types';
const rank = { executable: 3, executable_with_warning: 2, not_executable: 1 } as const;
export function rankAlternatives(items: GymAwareExerciseAlternative[]): GymAwareExerciseAlternative[] { return [...items].sort((a, b) => rank[b.compatibilityStatus] - rank[a.compatibilityStatus] || b.candidateScore - a.candidateScore || a.exerciseId.localeCompare(b.exerciseId)); }
