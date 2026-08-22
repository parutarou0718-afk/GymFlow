import type { SubstitutionQuality } from '../exercise-substitution';
export const SAME_FAMILY_BASE_SCORE = 0.75; export const DEFAULT_LIMIT = 10; export const DEFAULT_MINIMUM_SCORE = 0.4;
export const qualityScore: Record<SubstitutionQuality, number> = { excellent: 0.95, good: 0.85, acceptable: 0.7, last_resort: 0.5 };
export const qualityRank: Record<SubstitutionQuality, number> = { excellent: 4, good: 3, acceptable: 2, last_resort: 1 };
