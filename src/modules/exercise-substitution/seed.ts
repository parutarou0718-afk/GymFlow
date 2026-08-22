import type { ExerciseSubstitution } from './types';
const now = new Date('2026-08-23T00:00:00Z').getTime();
export const substitutionSeeds: ExerciseSubstitution[] = [
  ['hack_squat','leg_press','good','Similar quad-focused machine pattern'], ['pull_up','lat_pulldown','good','Vertical pull alternative'], ['squat','hack_squat','acceptable','Supported squat alternative'], ['bench_press','dumbbell_bench_press','excellent','Same pressing pattern'], ['barbell_row','seated_cable_row','good','Horizontal row alternative']
].map(([sourceExerciseId,targetExerciseId,quality,reason], index) => ({ id: `seed-substitution-${index + 1}`, sourceExerciseId, targetExerciseId, quality: quality as ExerciseSubstitution['quality'], reason, status: 'active', createdAt: now, updatedAt: now }));
