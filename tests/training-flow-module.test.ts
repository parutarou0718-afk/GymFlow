import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';
import { createGymContextService } from '../src/modules/gym-context';
import { createInventoryService } from '../src/modules/gym-inventory';
import { createEquipmentService } from '../src/modules/equipment';
import { createExerciseService } from '../src/modules/exercise';
import { createExerciseEquipmentService } from '../src/modules/exercise-equipment';
import { createExerciseSubstitutionService } from '../src/modules/exercise-substitution';
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

async function setupRealProgramMatch() {
  const store = createWebStore();
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const programs = createProgramService(store);
  const matching = createMatchingService(store);
  const workouts = createWorkoutService(store);
  const inventory = createInventoryService(store);
  const equipment = createEquipmentService(store);
  const exercises = createExerciseService(store);
  const execution = createExerciseEquipmentService(store);
  const substitutions = createExerciseSubstitutionService(store);
  const flow = createTrainingFlowService({
    users: createUserService(store), gymContexts: contexts, gyms, inventory, programs,
    programMatching: createProgramMatchingService({ programs, matching }),
    programAdaptation: createProgramAdaptationService({ programs, gyms }), workouts,
  });
  const [gymA, gymB] = await Promise.all([
    gyms.createGym({ name: 'Gym A' }),
    gyms.createGym({ name: 'Gym B' }),
  ]);
  const createProgramForExercise = async (name: string, exerciseId: string) => programs.createProgram({
    name,
    description: '',
    exercises: [{ id: `${name}-entry`, exerciseId, order: 0, targetSets: [] }],
  });

  return { contexts, flow, gymA, gymB, workouts, inventory, equipment, exercises, execution, substitutions, createProgramForExercise };
}

test('Training Flow starts a fully executable Program at the matched Current Gym', async () => {
  const { contexts, flow, gymA, workouts, exercises, createProgramForExercise } = await setupRealProgramMatch();
  const exercise = await exercises.createExercise({ name: 'Fully executable movement', aliases: [], category: 'compound', movementPattern: 'horizontal_push', primaryMuscles: ['chest'], secondaryMuscles: [] });
  const program = await createProgramForExercise('Fully executable Program', exercise.id);
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);

  assert.equal((await flow.matchProgramForCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id })).status, 'fully_executable');
  const session = await flow.startProgramWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id });

  assert.equal(session.gymId, gymA.id);
  assert.equal((await workouts.getWorkout(session.id))?.gymId, gymA.id);
});

test('Training Flow starts a warning Program at the matched Current Gym without adaptation', async () => {
  const { contexts, flow, gymA, workouts, inventory, equipment, exercises, execution, createProgramForExercise } = await setupRealProgramMatch();
  const exercise = await exercises.createExercise({ name: 'Warning movement', aliases: [], category: 'compound', movementPattern: 'horizontal_push', primaryMuscles: ['chest'], secondaryMuscles: [] });
  const [required, preferred] = await Promise.all([
    equipment.createEquipment({ name: 'Required test equipment', category: 'machine' }),
    equipment.createEquipment({ name: 'Preferred test equipment', category: 'accessory' }),
  ]);
  const group = await execution.createRequirementGroup(exercise.id, { name: 'Warning requirements' });
  await execution.addEquipmentRequirement(group.id, { equipmentId: required.id, level: 'required' });
  await execution.addEquipmentRequirement(group.id, { equipmentId: preferred.id, level: 'preferred' });
  await inventory.addEquipmentToGym(gymA.id, required.id, { quantity: 1, status: 'available' });
  const program = await createProgramForExercise('Warning Program', exercise.id);
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);

  assert.equal((await flow.matchProgramForCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id })).status, 'executable_with_warnings');
  const session = await flow.startProgramWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id });

  assert.equal(session.gymId, gymA.id);
  assert.equal((await workouts.getWorkout(session.id))?.gymId, gymA.id);
});

test('Training Flow rejects an adaptable Program without creating a Workout', async () => {
  const { contexts, flow, gymA, workouts, inventory, equipment, exercises, execution, substitutions, createProgramForExercise } = await setupRealProgramMatch();
  const [source, replacement] = await Promise.all([
    exercises.createExercise({ name: 'Adaptable source movement', aliases: [], category: 'compound', movementPattern: 'horizontal_push', primaryMuscles: ['chest'], secondaryMuscles: [] }),
    exercises.createExercise({ name: 'Available replacement movement', aliases: [], category: 'compound', movementPattern: 'horizontal_push', primaryMuscles: ['chest'], secondaryMuscles: [] }),
  ]);
  const [missingEquipment, replacementEquipment] = await Promise.all([
    equipment.createEquipment({ name: 'Missing source equipment', category: 'machine' }),
    equipment.createEquipment({ name: 'Replacement equipment', category: 'machine' }),
  ]);
  const [sourceGroup, replacementGroup] = await Promise.all([
    execution.createRequirementGroup(source.id, { name: 'Source requirements' }),
    execution.createRequirementGroup(replacement.id, { name: 'Replacement requirements' }),
  ]);
  await execution.addEquipmentRequirement(sourceGroup.id, { equipmentId: missingEquipment.id, level: 'required' });
  await execution.addEquipmentRequirement(replacementGroup.id, { equipmentId: replacementEquipment.id, level: 'required' });
  await inventory.addEquipmentToGym(gymA.id, replacementEquipment.id, { quantity: 1, status: 'available' });
  await substitutions.createSubstitution({ sourceExerciseId: source.id, targetExerciseId: replacement.id, quality: 'good' });
  const program = await createProgramForExercise('Adaptable Program', source.id);
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);
  const before = (await workouts.getWorkoutHistory()).length;

  assert.equal((await flow.matchProgramForCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id })).status, 'requires_adaptation');
  await assert.rejects(() => flow.startProgramWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id }), /PROGRAM_REQUIRES_ADAPTATION/);

  assert.equal((await workouts.getWorkoutHistory()).length, before);
});

test('Training Flow rejects a blocked Program without creating a Workout', async () => {
  const { contexts, flow, gymA, workouts, equipment, exercises, execution, createProgramForExercise } = await setupRealProgramMatch();
  const exercise = await exercises.createExercise({ name: 'Blocked movement', aliases: [], category: 'cardio', movementPattern: 'cardio', primaryMuscles: [], secondaryMuscles: [] });
  const required = await equipment.createEquipment({ name: 'Blocked test equipment', category: 'machine' });
  const group = await execution.createRequirementGroup(exercise.id, { name: 'Blocked requirements' });
  await execution.addEquipmentRequirement(group.id, { equipmentId: required.id, level: 'required' });
  const program = await createProgramForExercise('Blocked Program', exercise.id);
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);
  const before = (await workouts.getWorkoutHistory()).length;

  assert.equal((await flow.matchProgramForCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id })).status, 'not_executable');
  await assert.rejects(() => flow.startProgramWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id }), /PROGRAM_NOT_EXECUTABLE/);

  assert.equal((await workouts.getWorkoutHistory()).length, before);
});

test('Training Flow rejects a stale Current Gym before creating a Program Workout', async () => {
  const { contexts, flow, gymA, gymB, workouts, exercises, createProgramForExercise } = await setupRealProgramMatch();
  const exercise = await exercises.createExercise({ name: 'Stale-context movement', aliases: [], category: 'compound', movementPattern: 'horizontal_push', primaryMuscles: ['chest'], secondaryMuscles: [] });
  const program = await createProgramForExercise('Stale-context Program', exercise.id);
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);
  const before = (await workouts.getWorkoutHistory()).length;
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymB.id);

  await assert.rejects(() => flow.startProgramWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: gymA.id }), /CURRENT_GYM_CHANGED/);

  assert.equal((await workouts.getWorkoutHistory()).length, before);
});

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
