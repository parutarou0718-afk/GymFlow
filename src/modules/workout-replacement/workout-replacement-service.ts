import type { ExerciseCandidate } from '../candidate-resolution';
import type { MatchingService } from '../matching';
import type { ExerciseMaster } from '../exercise';
import type { WorkoutService } from '../workout';
import type { WorkoutReplacementService, GetWorkoutReplacementOptionsInput, ReplaceWorkoutExerciseSelection, WorkoutReplacementOptions } from './types';

export interface WorkoutReplacementDependencies {
  workouts: Pick<WorkoutService, 'getWorkout' | 'replaceWorkoutExercise' | 'getWorkoutForOwner' | 'replaceWorkoutExerciseForOwner'>;
  candidates: { resolveExerciseCandidates(input: { exerciseId: string }): Promise<ExerciseCandidate[]> };
  matching: Pick<MatchingService, 'matchExerciseToGym'>;
  exercises: { getExercise(id: string): Promise<ExerciseMaster | null> };
}

export function createWorkoutReplacementService(dependencies: WorkoutReplacementDependencies): WorkoutReplacementService {
  const getSessionExercise = async ({ sessionId, sessionExerciseId }: GetWorkoutReplacementOptionsInput, userId?: string) => {
    const session = userId
      ? await dependencies.workouts.getWorkoutForOwner(userId, sessionId)
      : await dependencies.workouts.getWorkout(sessionId);
    if (!session) throw new Error('WORKOUT_EXERCISE_NOT_FOUND');
    if (session.status !== 'active' && session.status !== 'paused') throw new Error('WORKOUT_NOT_ACTIVE');
    const exercise = session.exercises.find(item => item.id === sessionExerciseId);
    if (!exercise) throw new Error('WORKOUT_EXERCISE_NOT_FOUND');
    const completedSetCount = exercise.sets.filter(set => set.completed).length;
    if (exercise.sets.length > 0 && completedSetCount === exercise.sets.length) throw new Error('EXERCISE_ALREADY_COMPLETED');
    return { session, exercise, completedSetCount };
  };

  const buildOptions = async (input: GetWorkoutReplacementOptionsInput, userId?: string): Promise<WorkoutReplacementOptions> => {
    const { session, exercise, completedSetCount } = await getSessionExercise(input, userId);
    const candidates: ExerciseCandidate[] = await dependencies.candidates.resolveExerciseCandidates({ exerciseId: exercise.exerciseId });
    const options = [];
    for (const candidate of candidates) {
      const master = await dependencies.exercises.getExercise(candidate.exerciseId);
      if (!master || master.status === 'archived') continue;
      if (session.gymId) {
        const result = await dependencies.matching.matchExerciseToGym({ exerciseId: candidate.exerciseId, gymId: session.gymId, includeAlternatives: false });
        if (result.status === 'not_executable') continue;
        options.push({ exerciseId: candidate.exerciseId, name: master.name, sources: candidate.sources, score: candidate.score, reasonCodes: candidate.reasons, quality: candidate.quality, gymStatus: result.status, issues: result.issues });
      } else {
        options.push({ exerciseId: candidate.exerciseId, name: master.name, sources: candidate.sources, score: candidate.score, reasonCodes: candidate.reasons, quality: candidate.quality, gymStatus: null, issues: [] });
      }
    }
    return { sessionId: session.id, sessionExerciseId: exercise.id, gymId: session.gymId ?? null, gymValidation: session.gymId ? 'verified' : 'not_available', completedSetCount, totalSetCount: exercise.sets.length, options };
  };

  return {
    getWorkoutReplacementOptions: buildOptions,
    async replaceExercise(input: ReplaceWorkoutExerciseSelection) {
      const options = await buildOptions(input);
      if (options.completedSetCount !== input.expectedCompletedSetCount) throw new Error('REPLACEMENT_OPTIONS_CHANGED');
      if (!options.options.some(option => option.exerciseId === input.replacementExerciseId)) throw new Error(options.options.length ? 'INVALID_REPLACEMENT' : 'NO_REPLACEMENT_AVAILABLE');
      return dependencies.workouts.replaceWorkoutExercise(input);
    },
    async getWorkoutReplacementOptionsForOwner(userId, input) {
      return buildOptions(input, userId);
    },
    async replaceExerciseForOwner(userId, input) {
      const options = await buildOptions(input, userId);
      if (options.completedSetCount !== input.expectedCompletedSetCount) throw new Error('REPLACEMENT_OPTIONS_CHANGED');
      if (!options.options.some(option => option.exerciseId === input.replacementExerciseId)) throw new Error(options.options.length ? 'INVALID_REPLACEMENT' : 'NO_REPLACEMENT_AVAILABLE');
      return dependencies.workouts.replaceWorkoutExerciseForOwner(userId, input);
    },
  };
}
