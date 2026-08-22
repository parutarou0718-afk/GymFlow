import type { SubstitutionQuality } from '../exercise-substitution';
export type TrainingIntent = 'strength' | 'hypertrophy' | 'general_fitness' | 'conditioning' | 'rehab' | 'unknown';
export type CandidateSource = 'same_family' | 'curated' | 'attribute_fallback';
export type CandidateReasonCode = 'same_movement_family' | 'same_movement_pattern' | 'primary_muscle_overlap' | 'secondary_muscle_overlap' | 'same_category' | 'category_mismatch' | 'compound_isolation_mismatch' | 'curated_substitution' | 'training_intent_match';
export interface ResolveExerciseCandidatesInput { exerciseId: string; trainingIntent?: TrainingIntent; limit?: number; minimumScore?: number; }
export interface ExerciseCandidate { exerciseId: string; sources: CandidateSource[]; score: number; reasons: CandidateReasonCode[]; quality?: SubstitutionQuality; matchedFamilyIds?: string[]; }
