import type { Gym } from '../gym';
import type { TrainingFlowDependencies, CurrentGymTrainingState, CurrentGymInput, MatchProgramForCurrentGymInput, AdaptProgramForCurrentGymInput, StartProgramWorkoutInput, StartQuickWorkoutInput } from './types';

export interface TrainingFlowService {
  getTrainingFlowState(input: CurrentGymInput): Promise<CurrentGymTrainingState>;
  matchProgramForCurrentGym(input: MatchProgramForCurrentGymInput): Promise<Awaited<ReturnType<TrainingFlowDependencies['programMatching']['matchProgramToGym']>>>;
  createAdaptedProgramForCurrentGym(input: AdaptProgramForCurrentGymInput): ReturnType<TrainingFlowDependencies['programAdaptation']['createAdaptedProgram']>;
  startProgramWorkoutAtCurrentGym(input: StartProgramWorkoutInput): ReturnType<TrainingFlowDependencies['workouts']['startWorkoutFromTemplate']>;
  startQuickWorkoutAtCurrentGym(input: StartQuickWorkoutInput): ReturnType<TrainingFlowDependencies['workouts']['startQuickWorkout']>;
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
  };
}
