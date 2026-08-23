# History Save as Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a completed Workout Session be copied into a new independent Program through the Program public API.

**Architecture:** The Program module adds `CreateProgramInput` and a pure `createProgramInputFromCompletedWorkout` converter. The history-detail UI reads the completed session through Workout, asks for a name, calls Program `createProgram`, and never accesses template storage directly.

**Tech Stack:** TypeScript, React Native Modal, Expo Router, Node test runner, existing SQLite/Web stores.

## Global Constraints

- Copy, not link: a saved Program must have a new ID and value-copied exercises/sets.
- Preserve exercise IDs, exercise order, set order, weight, and reps.
- Only completed sessions are convertible.
- Do not implement Program Matching, alter Workout, or redesign History.

---

### Task 1: Define the copy conversion and create input

**Files:**
- Modify: `src/modules/program/types.ts`
- Create: `src/modules/program/session-to-program.ts`
- Modify: `src/modules/program/program-service.ts`
- Modify: `src/modules/program/index.ts`
- Test: `tests/program-module.test.ts`

**Interfaces:**
- Consumes: `WorkoutSession` with `status: completed`.
- Produces: `CreateProgramInput`, `createProgramInputFromCompletedWorkout(session, name)`, and `ProgramService.createProgram(input)`.

- [ ] **Step 1: Write the failing copy test**

```ts
const input = createProgramInputFromCompletedWorkout(completedSession, 'Copied workout');
assert.deepEqual(input.exercises.map(item => item.exerciseId), ['bench_press']);
assert.deepEqual(input.exercises[0].targetSets, [{ setIndex: 0, weight: 60, reps: 8, unit: 'kg' }]);
const saved = await service.createProgram(input);
assert.notEqual(saved.id, completedSession.id);
```

- [ ] **Step 2: Run `npx tsx --test tests/program-module.test.ts` and verify it fails because the converter and input do not exist.**

- [ ] **Step 3: Implement the pure converter and generated-ID create API.**

```ts
export type CreateProgramInput = Pick<Program, 'name' | 'description' | 'exercises'>;
export function createProgramInputFromCompletedWorkout(session: WorkoutSession, name: string): CreateProgramInput;
createProgram(input: CreateProgramInput): Promise<Program>;
```

- [ ] **Step 4: Run the focused test and verify it passes.**

### Task 2: Add the minimal history-detail save control

**Files:**
- Modify: `src/components/history/index.tsx`
- Modify: `tests/program-module.test.ts`

**Interfaces:**
- Consumes: `createProgramInputFromCompletedWorkout` and `createProgramService(store)`.
- Produces: a name-editable `Save as Program` action that invokes the Program public API once per confirmation.

- [ ] **Step 1: Write source-boundary assertions requiring converter/API use and rejecting `store.templates`.**

```ts
assert.match(history, /createProgramInputFromCompletedWorkout/);
assert.match(history, /createProgramService/);
assert.doesNotMatch(history, /store\.templates/);
```

- [ ] **Step 2: Run the focused test and verify it fails.**

- [ ] **Step 3: Add a Modal with an editable default name, Cancel, and a saving-locked Save action.**

- [ ] **Step 4: Run focused tests and TypeScript validation.**

### Task 3: Full verification and checkpoint

**Files:**
- Modify: `tests/program-module.test.ts`

- [ ] **Step 1: Verify copied Program and original completed session remain independently mutable.**
- [ ] **Step 2: Run `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, and `npx expo export --platform web`.**
- [ ] **Step 3: Commit with `feat: save completed workout as program`.**
