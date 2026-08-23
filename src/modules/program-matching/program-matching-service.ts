import type { ProgramMatchingDependencies } from './ports';
import { deriveProgramMatchStatus, summarizeProgramMatches } from './aggregation';
import type { MatchProgramToGymInput, ProgramExerciseMatchResult, ProgramGymMatchResult } from './types';

export interface ProgramMatchingService { matchProgramToGym(input: MatchProgramToGymInput): Promise<ProgramGymMatchResult>; }
export function createProgramMatchingService(dependencies: ProgramMatchingDependencies): ProgramMatchingService {
  return { async matchProgramToGym(input) {
    const program = await dependencies.programs.getProgram(input.programId);
    if (!program) throw new Error(`Program not found: ${input.programId}`);
    const exercises: ProgramExerciseMatchResult[] = [];
    for (const item of program.exercises) {
      const internalMatch = await dependencies.matching.matchExerciseToGym({ exerciseId: item.exerciseId, gymId: input.gymId, context: input.exerciseContexts?.[item.id], includeAlternatives: true });
      const match = input.includeAlternatives === false ? { ...internalMatch, alternatives: [] } : internalMatch;
      exercises.push({ order: item.order, exerciseId: item.exerciseId, originalProgramExercise: structuredClone(item), match, recommendedAlternativeExerciseId: internalMatch.alternatives[0]?.exerciseId ?? null });
    }
    const summary = summarizeProgramMatches(exercises);
    return { programId: program.id, gymId: input.gymId, status: deriveProgramMatchStatus(summary), summary, exercises, emptyProgram: !exercises.length };
  } };
}
