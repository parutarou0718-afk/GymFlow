import type { ProgramGymMatchResult } from '../program-matching';
export type ReplacementDecision = { status: 'pending' } | { status: 'selected'; replacementExerciseId: string } | { status: 'unresolved' };
export interface ReplacementOption { exerciseId: string; quality?: string | null; score?: number | null; sources: string[]; reasonCodes: string[]; gymStatus: 'executable' | 'executable_with_warning'; }
export interface ReplacementReviewItem { programExerciseKey: string; originalExerciseId: string; options: ReplacementOption[]; decision: ReplacementDecision; }
export interface ReplacementReview { programId: string; gymId: string; programUpdatedAt: number; matchResult: ProgramGymMatchResult; items: ReplacementReviewItem[]; status: 'ready' | 'incomplete' | 'blocked'; }
