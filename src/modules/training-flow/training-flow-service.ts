import type { Gym } from '../gym';
import { createReplacementReviewService } from '../replacement-review';
import type { TrainingFlowDependencies, CurrentGymTrainingState, CurrentGymInput, MatchProgramForCurrentGymInput, AdaptProgramForCurrentGymInput, StartProgramWorkoutInput, StartQuickWorkoutInput } from './types';

export interface TrainingFlowService {
  getTrainingFlowState(input: CurrentGymInput): Promise<CurrentGymTrainingState>;
  matchProgramForCurrentGym(input: MatchProgramForCurrentGymInput): Promise<Awaited<ReturnType<TrainingFlowDependencies['programMatching']['matchProgramToGym']>>>;
  createAdaptedProgramForCurrentGym(input: AdaptProgramForCurrentGymInput): ReturnType<TrainingFlowDependencies['programAdaptation']['createAdaptedProgram']>;
  startProgramWorkoutAtCurrentGym(input: StartProgramWorkoutInput): ReturnType<TrainingFlowDependencies['workouts']['startWorkoutFromTemplate']>;
  startQuickWorkoutAtCurrentGym(input: StartQuickWorkoutInput): ReturnType<TrainingFlowDependencies['workouts']['startQuickWorkout']>;
  createAdaptedProgramFromReview(input: import('./types').CreateAdaptedProgramFromReviewInput): ReturnType<TrainingFlowDependencies['programAdaptation']['createAdaptedProgram']>;
}

export function createTrainingFlowService(dependencies: TrainingFlowDependencies): TrainingFlowService {
  const resolveCurrentGym = async ({ userId, expectedGymId }: CurrentGymInput): Promise<Gym> => {
    const user = await dependencies.users.getUser(userId);
    if (!user || user.status !== 'active') throw new Error('CURRENT_USER_UNAVAILABLE');
    const currentGymId = await dependencies.gymContexts.getCurrentGym(userId);
    if (!currentGymId) throw new Error('CURRENT_GYM_NOT_SELECTED');
    if (expectedGymId != null && expectedGymId !== currentGymId) throw new Error('CURRENT_GYM_CHANGED');
    const gym = await dependencies.gyms.getGym(currentGymId);
    if (!gym || gym.status === 'closed') throw new Error('CURRENT_GYM_UNAVAILABLE');
    return gym;
  };

  const match = async (input: MatchProgramForCurrentGymInput) => {
    const gym = await resolveCurrentGym(input);
    return dependencies.programMatching.matchProgramToGym({ programId: input.programId, gymId: gym.id, includeAlternatives: true });
  };

  return {
    async getTrainingFlowState(input) {
      const gym = await resolveCurrentGym(input);
      return { userId: input.userId, currentGym: gym, inventory: await dependencies.inventory.getGymEquipment(gym.id) };
    },
    matchProgramForCurrentGym: match,
    async createAdaptedProgramForCurrentGym(input) {
      const result = await match(input);
      if (result.status === 'not_executable') throw new Error('PROGRAM_NOT_EXECUTABLE');
      return dependencies.programAdaptation.createAdaptedProgram({ programId: input.programId, matchResult: result, name: input.name });
    },
    async startProgramWorkoutAtCurrentGym(input) {
      const result = await match(input);
      if (result.status === 'requires_adaptation') throw new Error('PROGRAM_REQUIRES_ADAPTATION');
      if (result.status === 'not_executable') throw new Error('PROGRAM_NOT_EXECUTABLE');
      return dependencies.workouts.startWorkoutFromTemplate({ templateId: input.programId, gymId: result.gymId });
    },
    async startQuickWorkoutAtCurrentGym(input) {
      const gym = await resolveCurrentGym(input);
      return dependencies.workouts.startQuickWorkout({ gymId: gym.id });
    },
    async createAdaptedProgramFromReview(input) {
      const gym = await resolveCurrentGym(input);
      const review = input.review;
      if (review.gymId !== gym.id) throw new Error('CURRENT_GYM_CHANGED');
      const program = await dependencies.programs.getProgram(review.programId);
      if (!program) throw new Error('PROGRAM_NOT_FOUND');
      if (program.updatedAt !== review.programUpdatedAt) throw new Error('PROGRAM_CHANGED');
      const currentMatch = await dependencies.programMatching.matchProgramToGym({ programId: program.id, gymId: gym.id, includeAlternatives: true });
      const refreshed = createReplacementReviewService().createReplacementReview({ matchResult: currentMatch, programUpdatedAt: program.updatedAt });
      const decisions = review.items.map(item => {
        const decision = item.decision;
        if (decision.status !== 'selected') throw new Error(decision.status === 'unresolved' ? 'NO_REPLACEMENT_AVAILABLE' : 'REVIEW_INCOMPLETE');
        const next = refreshed.items.find(value => value.programExerciseKey === item.programExerciseKey);
        if (!next || !next.options.some(option => option.exerciseId === decision.replacementExerciseId)) throw new Error('MATCH_RESULT_CHANGED');
        return { programExerciseId: item.programExerciseKey, replacementExerciseId: decision.replacementExerciseId };
      });
      if (refreshed.items.length !== review.items.length) throw new Error('MATCH_RESULT_CHANGED');
      return dependencies.programAdaptation.createAdaptedProgram({ programId: program.id, matchResult: currentMatch, decisions, name: input.name });
    },
  };
}
