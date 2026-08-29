import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';
import { createGymContextService } from '../src/modules/gym-context';
import { createInventoryService } from '../src/modules/gym-inventory';
import { createMatchingService } from '../src/modules/matching';
import { createProgramAdaptationService } from '../src/modules/program-adaptation';
import { createProgramMatchingService } from '../src/modules/program-matching';
import { createProgramService } from '../src/modules/program';
import { createReplacementReviewService } from '../src/modules/replacement-review';
import { createTrainingFlowService } from '../src/modules/training-flow';
import { DEFAULT_LOCAL_USER_ID, createUserService } from '../src/modules/user';
import { createWorkoutService } from '../src/modules/workout';

async function setup() {
  const store = createWebStore();
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const programs = createProgramService(store);
  const matching = createMatchingService(store);
  const programMatching = createProgramMatchingService({ programs, matching });
  const programAdaptation = createProgramAdaptationService({ programs, gyms });
  const workouts = createWorkoutService(store);
  const flow = createTrainingFlowService({ users: createUserService(store), gymContexts: contexts, gyms, inventory: createInventoryService(store), programs, programMatching, programAdaptation, workouts });
  const gymA = await gyms.createGym({ name: 'Gym A' });
  const gymB = await gyms.createGym({ name: 'Gym B' });
  const program = await programs.createProgram({ name: 'Empty executable Program', description: '', exercises: [] });
  return { contexts, flow, gymA, gymB, program, workouts };
}

test('Training Flow passes the current Gym explicitly to Workout and rejects stale context', async () => {
  const { contexts, flow, gymA, gymB, program, workouts } = await setup();
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);
  const quick = await flow.startQuickWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, expectedGymId: gymA.id });
  assert.equal(quick.gymId, gymA.id);
  await workouts.discardWorkout(quick.id);
  assert.equal((await flow.startProgramWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id })).gymId, gymA.id);

  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymB.id);
  await assert.rejects(() => flow.startQuickWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, expectedGymId: gymA.id }), /CURRENT_GYM_CHANGED/);
});

test('Training Flow requires explicit adaptation before starting a replaceable Program', async () => {
  const { contexts, flow, gymA, program } = await setup();
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);
  const base = await flow.matchProgramForCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id });
  const blocked = createTrainingFlowService({
    users: { getUser: async () => ({ id: DEFAULT_LOCAL_USER_ID, status: 'active' } as any) },
    gymContexts: contexts,
    gyms: { getGym: async () => gymA },
    inventory: { getGymEquipment: async () => [] },
    programs: { getProgram: async () => program },
    programMatching: { matchProgramToGym: async () => ({ ...base, status: 'requires_adaptation' }) },
    programAdaptation: { createAdaptedProgram: async () => program },
    workouts: { startQuickWorkout: async () => { throw new Error('not expected'); }, startWorkoutFromTemplate: async () => { throw new Error('must not start'); } },
  });
  await assert.rejects(() => blocked.startProgramWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id }), /PROGRAM_REQUIRES_ADAPTATION/);
});

test('Training Flow does not access active-workout persistence or duplicate Workout rules', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/modules/training-flow/training-flow-service.ts'), 'utf8');
  assert.doesNotMatch(source, /getActive|store\.|sessions/);
});

test('M17 rejects a replacement review when the Program, Current Gym, or selected candidate becomes stale', async () => {
  const { contexts, gymA, gymB, program } = await setup();
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);
  const match: any = {
    programId: program.id, gymId: gymA.id, status: 'requires_adaptation', emptyProgram: false,
    summary: { totalExercises: 1, executable: 0, executableWithWarning: 0, notExecutable: 1, replaceable: 1, unresolved: 0 },
    exercises: [{ order: 0, exerciseId: 'bench', originalProgramExercise: { id: 'entry-a', exerciseId: 'bench', order: 0, targetSets: [] }, match: { exerciseId: 'bench', gymId: gymA.id, status: 'not_executable', groupEvaluations: [], issues: [], alternatives: [{ exerciseId: 'dumbbell_bench', compatibilityStatus: 'executable', candidateScore: 1, candidateSources: [], candidateReasons: [], selectedRequirementGroupId: null, issues: [] }] }, recommendedAlternativeExerciseId: 'dumbbell_bench' }],
  };
  const reviewService = createReplacementReviewService();
  const selectedReview = reviewService.selectReplacement({ review: reviewService.createReplacementReview({ matchResult: match, programUpdatedAt: program.updatedAt }), programExerciseKey: 'entry-a', replacementExerciseId: 'dumbbell_bench' });
  const dependencies: any = {
    users: { getUser: async () => ({ id: DEFAULT_LOCAL_USER_ID, status: 'active' }) }, gymContexts: contexts,
    gyms: { getGym: async (id: string) => id === gymA.id ? gymA : gymB }, inventory: { getGymEquipment: async () => [] },
    programs: { getProgram: async () => program }, programMatching: { matchProgramToGym: async () => match },
    programAdaptation: { createAdaptedProgram: async () => { throw new Error('must not adapt stale review'); } },
    workouts: { startQuickWorkout: async () => { throw new Error('unused'); }, startWorkoutFromTemplate: async () => { throw new Error('unused'); } },
  };

  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymB.id);
  await assert.rejects(() => createTrainingFlowService(dependencies).createAdaptedProgramFromReview({ userId: DEFAULT_LOCAL_USER_ID, review: selectedReview }), /CURRENT_GYM_CHANGED/);

  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);
  const changedProgramFlow = createTrainingFlowService({ ...dependencies, programs: { getProgram: async () => ({ ...program, updatedAt: program.updatedAt + 1 }) } });
  await assert.rejects(() => changedProgramFlow.createAdaptedProgramFromReview({ userId: DEFAULT_LOCAL_USER_ID, review: selectedReview }), /PROGRAM_CHANGED/);

  const changedMatch = structuredClone(match);
  changedMatch.exercises[0].match.alternatives = [];
  const changedMatchFlow = createTrainingFlowService({ ...dependencies, programMatching: { matchProgramToGym: async () => changedMatch } });
  await assert.rejects(() => changedMatchFlow.createAdaptedProgramFromReview({ userId: DEFAULT_LOCAL_USER_ID, review: selectedReview }), /MATCH_RESULT_CHANGED/);
});
