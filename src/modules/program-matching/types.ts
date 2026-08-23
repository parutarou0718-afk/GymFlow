import type { ExerciseGymMatchResult, ExerciseMatchContext } from '../matching';
import type { ProgramExercise } from '../program';

export type ProgramGymMatchStatus = 'fully_executable' | 'executable_with_warnings' | 'requires_adaptation' | 'not_executable';
export interface MatchProgramToGymInput { programId: string; gymId: string; includeAlternatives?: boolean; exerciseContexts?: Record<string, ExerciseMatchContext>; }
export interface ProgramGymMatchSummary { totalExercises: number; executable: number; executableWithWarning: number; notExecutable: number; replaceable: number; unresolved: number; }
export interface ProgramExerciseMatchResult { order: number; exerciseId: string; originalProgramExercise: ProgramExercise; match: ExerciseGymMatchResult; recommendedAlternativeExerciseId: string | null; }
export interface ProgramGymMatchResult { programId: string; gymId: string; status: ProgramGymMatchStatus; summary: ProgramGymMatchSummary; exercises: ProgramExerciseMatchResult[]; emptyProgram: boolean; }
