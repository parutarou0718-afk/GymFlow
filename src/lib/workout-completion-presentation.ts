import type { WorkoutSession } from "../modules/workout";

export function formatCompletionDuration(
  startedAt: number,
  completedAt?: number,
): string {
  if (
    completedAt == null ||
    !Number.isFinite(startedAt) ||
    !Number.isFinite(completedAt) ||
    completedAt < startedAt
  ) {
    return "Duration unavailable";
  }

  const minutes = Math.floor((completedAt - startedAt) / 60_000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return hours > 0 ? `${hours} hr ${remainingMinutes} min` : `${minutes} min`;
}

export function getCompletedExerciseCount(session: WorkoutSession): number {
  return session.exercises.filter((exercise) =>
    exercise.sets.some((set) => set.completed),
  ).length;
}

export function getCompletedVolume(session: WorkoutSession): number {
  return session.exercises
    .flatMap((exercise) => exercise.sets)
    .filter((set) => set.completed)
    .reduce((total, set) => total + set.weight * set.reps, 0);
}

export function getReplacementCount(session: WorkoutSession): number {
  return session.exercises.filter(
    (exercise) => exercise.replacedFromExerciseId != null,
  ).length;
}
