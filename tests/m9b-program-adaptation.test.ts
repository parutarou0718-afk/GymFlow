import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramAdaptationService } from '../src/modules/program-adaptation';
import type { Program } from '../src/modules/program';
import type { ProgramGymMatchResult } from '../src/modules/program-matching';

const original: Program = { id: 'original', name: 'Push', createdAt: 1, updatedAt: 1, exercises: [
  { id: 'keep', exerciseId: 'plank', order: 0, targetSets: [{ setIndex: 0, reps: 10, weight: 20, unit: 'kg' }] },
  { id: 'replace', exerciseId: 'bench_press', order: 1, targetSets: [{ setIndex: 0, reps: 8, weight: 80, unit: 'kg' }] },
] };
const result: ProgramGymMatchResult = { programId: 'original', gymId: 'gym', status: 'requires_adaptation', emptyProgram: false, summary: { totalExercises: 2, executable: 1, executableWithWarning: 0, notExecutable: 1, replaceable: 1, unresolved: 0 }, exercises: [
  { order: 0, exerciseId: 'plank', originalProgramExercise: original.exercises[0], match: { exerciseId: 'plank', gymId: 'gym', status: 'executable', groupEvaluations: [], issues: [], alternatives: [] }, recommendedAlternativeExerciseId: null },
  { order: 1, exerciseId: 'bench_press', originalProgramExercise: original.exercises[1], match: { exerciseId: 'bench_press', gymId: 'gym', status: 'not_executable', groupEvaluations: [], issues: [], alternatives: [] }, recommendedAlternativeExerciseId: 'dumbbell_bench_press' },
] };

test('M9B copies a match into a new Program and clears weight only for replacements', async () => {
  let created: any;
  const service = createProgramAdaptationService({ programs: { getProgram: async () => structuredClone(original), createProgram: async (input: any) => (created = { ...input, id: 'new' }) }, gyms: { getGym: async () => ({ id: 'gym', name: 'Gym A' }) } });
  const adapted = await service.createAdaptedProgram({ programId: 'original', matchResult: result });
  assert.equal(adapted.id, 'new'); assert.equal(created.name, 'Push — Gym A');
  assert.equal(created.exercises[0].exerciseId, 'plank'); assert.equal(created.exercises[0].targetSets[0].weight, 20);
  assert.equal(created.exercises[1].exerciseId, 'dumbbell_bench_press'); assert.equal(created.exercises[1].targetSets[0].reps, 8); assert.equal(created.exercises[1].targetSets[0].weight, 0);
  assert.deepEqual(original.exercises[1].targetSets[0].weight, 80);
});

test('M9B rejects unresolved matches without creating a Program', async () => {
  let created = false; const unresolved = structuredClone(result); unresolved.summary.unresolved = 1;
  const service = createProgramAdaptationService({ programs: { getProgram: async () => original, createProgram: async () => { created = true; throw new Error('unexpected'); } }, gyms: { getGym: async () => ({ id: 'gym', name: 'Gym A' }) } });
  await assert.rejects(() => service.createAdaptedProgram({ programId: 'original', matchResult: unresolved }), /unresolved/);
  assert.equal(created, false);
});

test('M17 uses an explicitly selected non-recommended replacement for its exact Program entry', async () => {
  let created: any;
  const service = createProgramAdaptationService({ programs: { getProgram: async () => structuredClone(original), createProgram: async (input: any) => (created = { ...input, id: 'new' }) }, gyms: { getGym: async () => ({ id: 'gym', name: 'Gym A' }) } });
  const selected = structuredClone(result); selected.exercises[1].match.alternatives = [
    { exerciseId: 'dumbbell_bench_press', compatibilityStatus: 'executable', candidateScore: 2, candidateSources: [], candidateReasons: [], selectedRequirementGroupId: null, issues: [] },
    { exerciseId: 'smith_bench_press', compatibilityStatus: 'executable', candidateScore: 1, candidateSources: [], candidateReasons: [], selectedRequirementGroupId: null, issues: [] },
  ];
  await service.createAdaptedProgram({ programId: 'original', matchResult: selected, decisions: [{ programExerciseId: 'replace', replacementExerciseId: 'smith_bench_press' }] });
  assert.equal(created.exercises[1].exerciseId, 'smith_bench_press');
});

test('M17 does not fall back to a recommendation when explicit decisions are incomplete', async () => {
  const service = createProgramAdaptationService({ programs: { getProgram: async () => original, createProgram: async () => { throw new Error('must not create'); } }, gyms: { getGym: async () => ({ id: 'gym', name: 'Gym A' }) } });
  await assert.rejects(
    () => service.createAdaptedProgram({ programId: 'original', matchResult: result, decisions: [] }),
    /REVIEW_INCOMPLETE/,
  );
});
