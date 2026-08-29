import type { Gym } from '../gym';
import type { GymContextService } from '../gym-context';
import type { GymEquipmentInventoryItem } from '../gym-inventory';
import type { Program, ProgramService } from '../program';
import type { ProgramAdaptationService } from '../program-adaptation';
import type { ProgramGymMatchResult, ProgramMatchingService } from '../program-matching';
import type { UserService } from '../user';
import type { WorkoutService } from '../workout';
import type { ReplacementReview } from '../replacement-review';

export interface TrainingFlowDependencies {
  users: Pick<UserService, 'getUser'>;
  gymContexts: GymContextService;
  gyms: { getGym(gymId: string): Promise<Gym | null> };
  inventory: { getGymEquipment(gymId: string): Promise<GymEquipmentInventoryItem[]> };
  programs: Pick<ProgramService, 'getProgram'>;
  programMatching: ProgramMatchingService;
  programAdaptation: ProgramAdaptationService;
  workouts: Pick<WorkoutService, 'startQuickWorkout' | 'startWorkoutFromTemplate'>;
}

export interface CurrentGymTrainingState {
  userId: string;
  currentGym: Gym | null;
  inventory: GymEquipmentInventoryItem[];
}

export interface CurrentGymInput { userId: string; expectedGymId?: string | null; }
export interface MatchProgramForCurrentGymInput extends CurrentGymInput { programId: string; }
export interface AdaptProgramForCurrentGymInput extends MatchProgramForCurrentGymInput { name?: string; }
export interface StartProgramWorkoutInput extends MatchProgramForCurrentGymInput {}
export interface StartQuickWorkoutInput extends CurrentGymInput {}
export interface CreateAdaptedProgramFromReviewInput extends CurrentGymInput { review: ReplacementReview; name?: string; }

export type { Program, ProgramGymMatchResult };
