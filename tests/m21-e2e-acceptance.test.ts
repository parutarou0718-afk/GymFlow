import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { createWebStore } from "../src/db/web-store";
import { createCandidateResolutionService } from "../src/modules/candidate-resolution";
import { createEquipmentService } from "../src/modules/equipment";
import { createExerciseService } from "../src/modules/exercise";
import { createExerciseEquipmentService } from "../src/modules/exercise-equipment";
import { createExerciseSubstitutionService } from "../src/modules/exercise-substitution";
import { createGymService } from "../src/modules/gym";
import { createGymContextService } from "../src/modules/gym-context";
import { createInventoryService } from "../src/modules/gym-inventory";
import { createMatchingService } from "../src/modules/matching";
import { createProgramAdaptationService } from "../src/modules/program-adaptation";
import { createProgramMatchingService } from "../src/modules/program-matching";
import { createProgramService } from "../src/modules/program";
import { createReplacementReviewService } from "../src/modules/replacement-review";
import { createTrainingFlowService } from "../src/modules/training-flow";
import { createUserGymService } from "../src/modules/user-gym";
import { createUserService, DEFAULT_LOCAL_USER_ID } from "../src/modules/user";
import { createWorkoutReplacementService } from "../src/modules/workout-replacement";
import { createWorkoutService } from "../src/modules/workout";
import {
  getCompletedExerciseCount,
  getCompletedVolume,
  getReplacementCount,
} from "../src/lib/workout-completion-presentation";

async function createJourneyFixture() {
  const store = createWebStore();
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const inventory = createInventoryService(store);
  const equipment = createEquipmentService(store);
  const exercises = createExerciseService(store);
  const execution = createExerciseEquipmentService(store);
  const substitutions = createExerciseSubstitutionService(store);
  const programs = createProgramService(store);
  const workouts = createWorkoutService(store);
  const matching = createMatchingService(store);
  const flow = createTrainingFlowService({
    users: createUserService(store),
    gymContexts: contexts,
    gyms,
    inventory,
    programs,
    programMatching: createProgramMatchingService({ programs, matching }),
    programAdaptation: createProgramAdaptationService({ programs, gyms }),
    workouts,
  });
  const replacement = createWorkoutReplacementService({
    workouts,
    matching,
    exercises,
    candidates: createCandidateResolutionService(store),
  });
  const [gymA, gymB, gymC] = await Promise.all([
    gyms.createGym({ name: "Gym A comprehensive" }),
    gyms.createGym({ name: "Gym B limited" }),
    gyms.createGym({ name: "Gym C hotel" }),
  ]);
  const [source, substitute] = await Promise.all([
    exercises.createExercise({
      name: "Barbell press",
      aliases: [],
      category: "compound",
      movementPattern: "horizontal_push",
      primaryMuscles: ["chest"],
      secondaryMuscles: [],
    }),
    exercises.createExercise({
      name: "Dumbbell press",
      aliases: [],
      category: "compound",
      movementPattern: "horizontal_push",
      primaryMuscles: ["chest"],
      secondaryMuscles: [],
    }),
  ]);
  const [barbell, dumbbells] = await Promise.all([
    equipment.createEquipment({ name: "Barbell rack", category: "rack" }),
    equipment.createEquipment({
      name: "Adjustable dumbbells",
      category: "free_weight",
    }),
  ]);
  const [sourceGroup, substituteGroup] = await Promise.all([
    execution.createRequirementGroup(source.id, {
      name: "Barbell requirement",
    }),
    execution.createRequirementGroup(substitute.id, {
      name: "Dumbbell requirement",
    }),
  ]);
  await execution.addEquipmentRequirement(sourceGroup.id, {
    equipmentId: barbell.id,
    level: "required",
  });
  await execution.addEquipmentRequirement(substituteGroup.id, {
    equipmentId: dumbbells.id,
    level: "required",
  });
  await substitutions.createSubstitution({
    sourceExerciseId: source.id,
    targetExerciseId: substitute.id,
    quality: "good",
  });
  await inventory.addEquipmentToGym(gymA.id, barbell.id, {
    quantity: 1,
    status: "available",
  });
  await inventory.addEquipmentToGym(gymA.id, dumbbells.id, {
    quantity: 1,
    status: "available",
  });
  await inventory.addEquipmentToGym(gymB.id, dumbbells.id, {
    quantity: 1,
    status: "available",
  });
  const program = await programs.createProgram({
    name: "P1 mixed equipment",
    description: "Two independent press entries",
    exercises: [
      {
        id: "p1-press-a",
        exerciseId: source.id,
        order: 0,
        targetSets: [
          { setIndex: 0, weight: 80, reps: 8, unit: "kg" },
          { setIndex: 1, weight: 80, reps: 8, unit: "kg" },
        ],
      },
      {
        id: "p1-press-b",
        exerciseId: source.id,
        order: 1,
        targetSets: [
          { setIndex: 0, weight: 70, reps: 10, unit: "kg" },
          { setIndex: 1, weight: 70, reps: 10, unit: "kg" },
        ],
      },
    ],
  });
  return {
    store,
    gyms,
    contexts,
    inventory,
    programs,
    workouts,
    flow,
    replacement,
    gymA,
    gymB,
    gymC,
    source,
    substitute,
    program,
  };
}

test("M21 acceptance A/B/C/L proves the same Program adapts by Gym and keeps duplicate entries independent", async () => {
  const fixture = await createJourneyFixture();
  const { contexts, flow, gymA, gymB, program, workouts, programs } = fixture;
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymA.id);
  const matchA = await flow.matchProgramForCurrentGym({
    userId: DEFAULT_LOCAL_USER_ID,
    programId: program.id,
    expectedGymId: gymA.id,
  });
  assert.equal(matchA.status, "fully_executable");
  const atGymA = await flow.startProgramWorkoutAtCurrentGym({
    userId: DEFAULT_LOCAL_USER_ID,
    programId: program.id,
    expectedGymId: gymA.id,
  });
  assert.equal(atGymA.gymId, gymA.id);
  assert.equal(atGymA.templateId, program.id);
  assert.deepEqual(
    atGymA.exercises.map((item) => item.exerciseId),
    program.exercises.map((item) => item.exerciseId),
  );
  await workouts.updateSet(atGymA.id, atGymA.exercises[0].id, 0, {
    completed: true,
  });
  const completedA = await workouts.finishWorkout(atGymA.id);
  assert.equal(completedA.status, "completed");
  assert.equal(
    (await workouts.getWorkoutHistoryDetail(completedA.id))?.gymId,
    gymA.id,
  );
  assert.equal(getCompletedExerciseCount(completedA), 1);
  assert.equal(
    (await workouts.getWorkoutHistory()).some(
      (item) => item.id === completedA.id,
    ),
    true,
  );

  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymB.id);
  const matchB = await flow.matchProgramForCurrentGym({
    userId: DEFAULT_LOCAL_USER_ID,
    programId: program.id,
    expectedGymId: gymB.id,
  });
  assert.equal(matchB.status, "requires_adaptation");
  assert.equal(matchA.programId, matchB.programId);
  assert.notEqual(matchA.gymId, matchB.gymId);
  await assert.rejects(
    () =>
      flow.startProgramWorkoutAtCurrentGym({
        userId: DEFAULT_LOCAL_USER_ID,
        programId: program.id,
        expectedGymId: gymB.id,
      }),
    /PROGRAM_REQUIRES_ADAPTATION/,
  );

  const reviews = createReplacementReviewService();
  let review = reviews.createReplacementReview({
    matchResult: matchB,
    programUpdatedAt: program.updatedAt,
  });
  assert.equal(review.items.length, 2);
  assert.equal(review.status, "incomplete");
  assert.equal(review.items[0].decision.status, "pending");
  review = reviews.selectReplacement({
    review,
    programExerciseKey: "p1-press-a",
    replacementExerciseId: fixture.substitute.id,
  });
  assert.equal(review.items[0].decision.status, "selected");
  assert.equal(review.items[1].decision.status, "pending");
  review = reviews.selectReplacement({
    review,
    programExerciseKey: "p1-press-b",
    replacementExerciseId: fixture.substitute.id,
  });
  const adapted = await flow.createAdaptedProgramFromReview({
    userId: DEFAULT_LOCAL_USER_ID,
    expectedGymId: gymB.id,
    review,
  });
  assert.notEqual(adapted.id, program.id);
  assert.deepEqual(
    (await programs.getProgram(program.id))?.exercises.map(
      (item) => item.exerciseId,
    ),
    [fixture.source.id, fixture.source.id],
  );
  assert.deepEqual(
    adapted.exercises.map((item) => item.exerciseId),
    [fixture.substitute.id, fixture.substitute.id],
  );
  assert.deepEqual(
    adapted.exercises.map((item) => item.targetSets.map((set) => set.reps)),
    [
      [8, 8],
      [10, 10],
    ],
  );
  assert.deepEqual(
    adapted.exercises.map((item) => item.targetSets.map((set) => set.weight)),
    [
      [0, 0],
      [0, 0],
    ],
  );
  assert.equal(
    (
      await flow.matchProgramForCurrentGym({
        userId: DEFAULT_LOCAL_USER_ID,
        programId: adapted.id,
        expectedGymId: gymB.id,
      })
    ).status,
    "fully_executable",
  );
  const atGymB = await flow.startProgramWorkoutAtCurrentGym({
    userId: DEFAULT_LOCAL_USER_ID,
    programId: adapted.id,
    expectedGymId: gymB.id,
  });
  assert.equal(atGymB.gymId, gymB.id);
  assert.equal((await workouts.finishWorkout(atGymB.id)).status, "completed");
});

test("M21 acceptance D/E/G keeps an active Workout scoped to its starting Gym and records partial replacement facts", async () => {
  const fixture = await createJourneyFixture();
  const { contexts, gymA, gymB, inventory, workouts, replacement, source } =
    fixture;
  const started = await workouts.startQuickWorkout({ gymId: gymA.id });
  const withExercise = await workouts.addExercise(started.id, {
    id: source.id,
    name: source.name,
    force: null,
    level: "beginner",
    mechanic: null,
    equipment: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    instructions: [],
    category: "strength",
    images: [],
  });
  const entry = withExercise.exercises[0];
  for (let index = 0; index < 4; index += 1)
    await workouts.addSet(started.id, entry.id);
  await workouts.updateSet(started.id, entry.id, 0, {
    weight: 80,
    reps: 8,
    completed: true,
  });
  await workouts.updateSet(started.id, entry.id, 1, {
    weight: 80,
    reps: 8,
    completed: true,
  });
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gymB.id);
  const beforeInventory = await inventory.getGymEquipment(gymA.id);
  const options = await replacement.getWorkoutReplacementOptions({
    sessionId: started.id,
    sessionExerciseId: entry.id,
  });
  assert.equal(options.gymId, gymA.id);
  assert.ok(options.options.length > 0);
  const selectedCandidate = options.options[0].exerciseId;
  const replaced = await replacement.replaceExercise({
    sessionId: started.id,
    sessionExerciseId: entry.id,
    replacementExerciseId: selectedCandidate,
    reason: "equipment_occupied",
    expectedCompletedSetCount: 2,
  });
  assert.equal(await contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID), gymB.id);
  assert.equal(replaced.gymId, gymA.id);
  assert.equal(replaced.exercises.length, 2);
  assert.equal(replaced.exercises[0].exerciseId, source.id);
  assert.equal(
    replaced.exercises[0].sets.filter((set) => set.completed).length,
    2,
  );
  assert.equal(replaced.exercises[1].exerciseId, selectedCandidate);
  assert.equal(replaced.exercises[1].replacedFromExerciseId, source.id);
  assert.equal(
    replaced.exercises[1].sets.every(
      (set) => set.weight === 0 && !set.completed,
    ),
    true,
  );
  assert.deepEqual(await inventory.getGymEquipment(gymA.id), beforeInventory);
  await workouts.updateSet(started.id, replaced.exercises[1].id, 0, {
    weight: 30,
    reps: 10,
    completed: true,
  });
  await workouts.updateSet(started.id, replaced.exercises[1].id, 1, {
    weight: 30,
    reps: 10,
    completed: true,
  });
  const completed = await workouts.finishWorkout(started.id);
  assert.equal(getCompletedExerciseCount(completed), 2);
  assert.equal(getReplacementCount(completed), 1);
  assert.equal(getCompletedVolume(completed), 1_880);
});

test("M21 acceptance F/H/I/K rejects unavailable replacements, preserves no-Gym Quick Workouts, and never creates false completion facts", async () => {
  const fixture = await createJourneyFixture();
  const { gymC, workouts, replacement, source, inventory, store, gymA } =
    fixture;
  const exercises = createExerciseService(store);
  await Promise.all(
    (await exercises.listExercises())
      .filter(
        (exercise) =>
          exercise.id !== source.id && exercise.id !== fixture.substitute.id,
      )
      .map((exercise) => exercises.archiveExercise(exercise.id)),
  );
  const blocked = await workouts.startQuickWorkout({ gymId: gymC.id });
  const withExercise = await workouts.addExercise(blocked.id, {
    id: source.id,
    name: source.name,
    force: null,
    level: "beginner",
    mechanic: null,
    equipment: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    instructions: [],
    category: "strength",
    images: [],
  });
  await workouts.addSet(blocked.id, withExercise.exercises[0].id);
  const before = await workouts.getWorkout(blocked.id);
  const options = await replacement.getWorkoutReplacementOptions({
    sessionId: blocked.id,
    sessionExerciseId: withExercise.exercises[0].id,
  });
  assert.equal(options.options.length, 0);
  await assert.rejects(
    () =>
      replacement.replaceExercise({
        sessionId: blocked.id,
        sessionExerciseId: withExercise.exercises[0].id,
        replacementExerciseId: "missing",
        reason: "equipment_occupied",
        expectedCompletedSetCount: 0,
      }),
    /NO_REPLACEMENT_AVAILABLE/,
  );
  assert.deepEqual(await workouts.getWorkout(blocked.id), before);

  await workouts.discardWorkout(blocked.id);
  const quick = await workouts.startQuickWorkout();
  const quickWithExercise = await workouts.addExercise(quick.id, {
    id: source.id,
    name: source.name,
    force: null,
    level: "beginner",
    mechanic: null,
    equipment: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    instructions: [],
    category: "strength",
    images: [],
  });
  await workouts.addSet(quick.id, quickWithExercise.exercises[0].id);
  await workouts.updateSet(quick.id, quickWithExercise.exercises[0].id, 0, {
    weight: 20,
    reps: 12,
    completed: true,
  });
  const completedQuick = await workouts.finishWorkout(quick.id);
  assert.equal(completedQuick.gymId, null);
  assert.equal((await workouts.getWorkoutHistoryDetail(quick.id))?.gymId, null);

  const failureStore = createWebStore() as ReturnType<typeof createWebStore> & {
    workoutCompletion: { complete: () => Promise<void> };
  };
  const failureWorkouts = createWorkoutService(failureStore);
  const failed = await failureWorkouts.startQuickWorkout({ gymId: gymA.id });
  const visitBefore = await createUserGymService(
    failureStore,
  ).getUserGymRelationship(DEFAULT_LOCAL_USER_ID, gymA.id);
  failureStore.workoutCompletion = {
    complete: async () => {
      throw new Error("completion persistence failed");
    },
  };
  await assert.rejects(
    () => failureWorkouts.finishWorkout(failed.id),
    /completion persistence failed/,
  );
  assert.equal((await failureWorkouts.getWorkout(failed.id))?.status, "active");
  assert.equal(
    (await failureWorkouts.getWorkoutHistory()).some(
      (item) => item.id === failed.id,
    ),
    false,
  );
  assert.notEqual(
    (await failureWorkouts.getWorkoutHistoryDetail(failed.id))?.status,
    "completed",
  );
  assert.equal(
    (await failureStore.events.getForSession(failed.id)).some(
      (event) => event.eventType === "WORKOUT_COMPLETED",
    ),
    false,
  );
  assert.deepEqual(
    await createUserGymService(failureStore).getUserGymRelationship(
      DEFAULT_LOCAL_USER_ID,
      gymA.id,
    ),
    visitBefore,
  );

  const visitWorkout = await workouts.startQuickWorkout({ gymId: gymA.id });
  const finished = await workouts.finishWorkout(visitWorkout.id);
  const relationship = await createUserGymService(store).getUserGymRelationship(
    DEFAULT_LOCAL_USER_ID,
    gymA.id,
  );
  assert.equal(relationship?.lastVisitedAt, finished.completedAt);
  await workouts.getWorkoutHistoryDetail(finished.id);
  await workouts.getWorkoutHistory();
  assert.equal(
    (
      await createUserGymService(store).getUserGymRelationship(
        DEFAULT_LOCAL_USER_ID,
        gymA.id,
      )
    )?.lastVisitedAt,
    finished.completedAt,
  );
});

test("M21 acceptance J and architecture boundaries keep Train Again Gym-aware and UI repositories private", async () => {
  const [summary, detail, review, active] = await Promise.all([
    readFile(resolve(process.cwd(), "app/workout-complete.tsx"), "utf8"),
    readFile(resolve(process.cwd(), "app/program-detail.tsx"), "utf8"),
    readFile(resolve(process.cwd(), "app/replacement-review.tsx"), "utf8"),
    readFile(
      resolve(process.cwd(), "src/components/session/ActiveWorkout.tsx"),
      "utf8",
    ),
  ]);
  assert.match(summary, /program-detail/);
  assert.match(summary, /Start a Quick Workout/);
  for (const source of [summary, detail, review, active]) {
    assert.doesNotMatch(
      source,
      /store\.(sessions|templates|events|gymInventory)/,
    );
    assert.doesNotMatch(source, /db\/database|from ['"][^'"]*database/);
  }
});
