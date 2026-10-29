import type { CandidateReasonCode, CandidateSource, ExerciseCandidate } from '../candidate-resolution';
import type { ExerciseGymCompatibilityStatus } from '../matching';
import type { WorkoutReplacementReason, WorkoutSession } from '../workout';

export interface WorkoutReplacementOption {
  exerciseId: string;
  name: string;
  sources: CandidateSource[];
  score: number;
  reasonCodes: CandidateReasonCode[];
  quality?: ExerciseCandidate['quality'];
  gymStatus: ExerciseGymCompatibilityStatus | null;
  issues: unknown[];
}

export interface WorkoutReplacementOptions {
  sessionId: string;
  sessionExerciseId: string;
  gymId: string | null;
  gymValidation: 'verified' | 'not_available';
  completedSetCount: number;
  totalSetCount: number;
  options: WorkoutReplacementOption[];
}

export interface GetWorkoutReplacementOptionsInput { sessionId: string; sessionExerciseId: string; }
export interface ReplaceWorkoutExerciseSelection extends GetWorkoutReplacementOptionsInput {
  replacementExerciseId: string;
  reason: WorkoutReplacementReason;
  expectedCompletedSetCount: number;
}
export interface WorkoutReplacementService {
  getWorkoutReplacementOptions(input: GetWorkoutReplacementOptionsInput): Promise<WorkoutReplacementOptions>;
  replaceExercise(input: ReplaceWorkoutExerciseSelection): Promise<WorkoutSession>;
  getWorkoutReplacementOptionsForOwner(userId: string, input: GetWorkoutReplacementOptionsInput): Promise<WorkoutReplacementOptions>;
  replaceExerciseForOwner(userId: string, input: ReplaceWorkoutExerciseSelection): Promise<WorkoutSession>;
}
