import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramMatchingService } from '../src/modules/program-matching';
import type { ExerciseGymMatchResult } from '../src/modules/matching';
import type { Program } from '../src/modules/program';

const program: Program = {
  id: 'program-m9', name: 'Ordered Program', createdAt: 1, updatedAt: 1,
  exercises: [
    { id: 'item-c', exerciseId: 'exercise-c', order: 3, targetSets: [{ setIndex: 0, weight: 30, reps: 8, unit: 'kg' }] },
    { id: 'item-a', exerciseId: 'exercise-a', order: 1, targetSets: [{ setIndex: 0, weight: 20, reps: 10, unit: 'kg' }] },
    { id: 'item-b', exerciseId: 'exercise-b', order: 2, targetSets: [{ setIndex: 0, weight: 10, reps: 12, unit: 'kg' }] },
  ],
};

function match(exerciseId: string, status: ExerciseGymMatchResult['status'], alternatives: ExerciseGymMatchResult['alternatives'] = []): ExerciseGymMatchResult {
  return { exerciseId, gymId: 'gym-m9', status, selectedRequirementGroupId: null, groupEvaluations: [], issues: [], alternatives };
}

function serviceFor(results: Record<string, ExerciseGymMatchResult>) {
  return createProgramMatchingService({
    programs: { getProgram: async (id: string) => id === program.id ? structuredClone(program) : null },
    matching: { matchExerciseToGym: async ({ exerciseId }: { exerciseId: string }) => results[exerciseId] },
  });
}

test('M9A aggregates fully executable, warning, replaceable, and unresolved programs without mutation', async () => {
  const alternative = { exerciseId: 'replacement', compatibilityStatus: 'executable' as const, candidateScore: 1, candidateSources: [], candidateReasons: [], issues: [] };
  const cases = [
    { results: { 'exercise-c': match('exercise-c', 'executable'), 'exercise-a': match('exercise-a', 'executable'), 'exercise-b': match('exercise-b', 'executable') }, status: 'fully_executable', replaceable: 0, unresolved: 0 },
    { results: { 'exercise-c': match('exercise-c', 'executable'), 'exercise-a': match('exercise-a', 'executable_with_warning'), 'exercise-b': match('exercise-b', 'executable') }, status: 'executable_with_warnings', replaceable: 0, unresolved: 0 },
    { results: { 'exercise-c': match('exercise-c', 'not_executable', [alternative]), 'exercise-a': match('exercise-a', 'executable'), 'exercise-b': match('exercise-b', 'executable') }, status: 'requires_adaptation', replaceable: 1, unresolved: 0 },
    { results: { 'exercise-c': match('exercise-c', 'not_executable', [alternative]), 'exercise-a': match('exercise-a', 'not_executable'), 'exercise-b': match('exercise-b', 'executable') }, status: 'not_executable', replaceable: 1, unresolved: 1 },
  ] as const;
  for (const item of cases) {
    const before = structuredClone(program);
    const result = await serviceFor(item.results).matchProgramToGym({ programId: program.id, gymId: 'gym-m9' });
    assert.equal(result.status, item.status);
    assert.equal(result.summary.replaceable, item.replaceable);
    assert.equal(result.summary.unresolved, item.unresolved);
    assert.equal(result.summary.executable + result.summary.executableWithWarning + result.summary.notExecutable, result.summary.totalExercises);
    assert.equal(result.summary.replaceable + result.summary.unresolved, result.summary.notExecutable);
    assert.deepEqual(result.exercises.map(value => value.exerciseId), ['exercise-c', 'exercise-a', 'exercise-b']);
    assert.deepEqual(program, before);
  }
});

test('M9A returns an empty program as fully executable and keeps matching deterministic', async () => {
  const empty: Program = { ...program, id: 'empty', exercises: [] };
  const service = createProgramMatchingService({ programs: { getProgram: async () => structuredClone(empty) }, matching: { matchExerciseToGym: async () => match('unused', 'executable') } });
  const first = await service.matchProgramToGym({ programId: 'empty', gymId: 'gym-m9' });
  const second = await service.matchProgramToGym({ programId: 'empty', gymId: 'gym-m9' });
  assert.equal(first.status, 'fully_executable');
  assert.equal(first.emptyProgram, true);
  assert.deepEqual(first, second);
});
