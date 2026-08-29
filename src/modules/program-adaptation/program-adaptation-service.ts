import { generateId } from '../../lib/utils';
import type { ProgramAdaptationDependencies, CreateAdaptedProgramInput, ProgramAdaptationService } from './types';
export function createProgramAdaptationService(dependencies: ProgramAdaptationDependencies): ProgramAdaptationService {
  return { async createAdaptedProgram(input: CreateAdaptedProgramInput) {
    if (input.matchResult.programId !== input.programId || input.matchResult.summary.unresolved > 0) throw new Error('Cannot create adapted Program with unresolved exercises');
    const [program, gym] = await Promise.all([dependencies.programs.getProgram(input.programId), dependencies.gyms.getGym(input.matchResult.gymId)]);
    if (!program) throw new Error(`Program not found: ${input.programId}`); if (!gym) throw new Error(`Gym not found: ${input.matchResult.gymId}`);
    const byItem = new Map(input.matchResult.exercises.map(item => [item.originalProgramExercise.id, item]));
    const decisions = new Map(input.decisions?.map(item => [item.programExerciseId, item.replacementExerciseId]));
    if (input.decisions && decisions.size !== input.decisions.length) throw new Error('INVALID_REPLACEMENT');
    const exercises = program.exercises.map(item => { const match = byItem.get(item.id); if (!match) throw new Error(`Missing match for Program exercise: ${item.id}`); if (match.match.status !== 'not_executable') return structuredClone(item); if (input.decisions && !decisions.has(item.id)) throw new Error('REVIEW_INCOMPLETE'); const selected = decisions.has(item.id) ? decisions.get(item.id) : match.recommendedAlternativeExerciseId; if (!selected) throw new Error('Cannot create adapted Program with unresolved exercises'); if (decisions.has(item.id) && !match.match.alternatives.some(candidate => candidate.exerciseId === selected && candidate.compatibilityStatus !== 'not_executable')) throw new Error('INVALID_REPLACEMENT'); return { ...structuredClone(item), id: generateId(), exerciseId: selected, exercise: undefined, targetSets: item.targetSets.map(set => ({ ...set, weight: 0 })) }; });
    return dependencies.programs.createProgram({ name: input.name?.trim() || `${program.name} — ${gym.name}`, description: program.description, exercises });
  } };
}
