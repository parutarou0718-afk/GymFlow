import { generateId } from '../../lib/utils';
import type { Exercise, WorkoutSession } from '../../types';
import type { CreateProgramInput, ProgramExercise } from './types';

function copyExercise(exercise: Exercise | undefined): Exercise | undefined {
  if (!exercise) return undefined;
  return {
    ...exercise,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    instructions: [...exercise.instructions],
    images: [...exercise.images],
  };
}

/** Creates a value copy of a completed workout suitable for a new Program. */
export function createProgramInputFromCompletedWorkout(
  session: WorkoutSession,
  name: string,
): CreateProgramInput {
  if (session.status !== 'completed') {
    throw new Error('Only completed workouts can be saved as a Program');
  }

  const programName = name.trim();
  if (!programName) {
    throw new Error('Program name is required');
  }

  const exercises: ProgramExercise[] = session.exercises.map(exercise => ({
    id: generateId(),
    exerciseId: exercise.exerciseId,
    exercise: copyExercise(exercise.exercise),
    order: exercise.order,
    notes: exercise.notes,
    targetSets: exercise.sets.map(set => ({
      setIndex: set.setIndex,
      weight: set.weight,
      reps: set.reps,
      unit: 'kg',
    })),
  }));

  return { name: programName, exercises };
}
