# M21 Slice 5 — Workout Completion Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present a reload-safe summary for a persisted completed Workout while preserving existing completion, Gym, and replacement semantics.

**Architecture:** A pure completion-presentation helper derives metrics from persisted session facts. A dedicated Expo route reloads the completed session through public services. The active-workout screen navigates to it only through the success callback of `WorkoutService.finishWorkout()`.

**Tech Stack:** Expo Router, React Native, TypeScript, Web Store, Node test runner via `tsx`.

## Global Constraints

- Keep `WorkoutService.finishWorkout()` as the only completion authority; do not create a second Visit or event.
- Never navigate to the summary on completion persistence failure.
- Accept only `sessionId` in the completion route and reload through `WorkoutService.getWorkoutHistoryDetail()`.
- Keep `WorkoutSession.gymId` as the Gym authority; null is a legal Quick Workout state.
- Use existing Gym, Exercise, Program, and Workout public services; do not query Store repositories in UI.
- Do not add or reorder replacement candidates, modify replacement decisions, or add a Slice 6 feature.
- Train Again must re-enter Program detail for template workouts and preserve no-Gym Quick Workout behavior.

---

### Task 1: Completion presentation helper and persisted-fact tests

**Files:**
- Create: `src/lib/workout-completion-presentation.ts`
- Create: `tests/workout-completion-presentation.test.ts`

**Interfaces:**
- Consumes: `WorkoutSession` from `src/modules/workout`.
- Produces: duration formatting, completed exercise count, completed volume, and replacement count functions.

- [ ] **Step 1: Write the failing test**

```ts
test('summarizes only completed sets and replacement provenance', () => {
  assert.equal(formatCompletionDuration(0, 4_320_000), '1 hr 12 min');
  assert.equal(getCompletedExerciseCount(session), 2);
  assert.equal(getCompletedVolume(session), 1_440);
  assert.equal(getReplacementCount(session), 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/workout-completion-presentation.test.ts`

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function getCompletedVolume(session: WorkoutSession) {
  return session.exercises.flatMap(item => item.sets)
    .filter(set => set.completed)
    .reduce((total, set) => total + set.weight * set.reps, 0);
}
```

Implement the count functions from session facts, and only format finite, non-negative timestamp differences.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/workout-completion-presentation.test.ts`

Expected: PASS with all helper tests green.

### Task 2: Persisted completion regression coverage

**Files:**
- Modify: `tests/workout-module.test.ts`

**Interfaces:**
- Consumes: existing `WorkoutService`, `createWebStore`, and public Gym/User-Gym services.
- Produces: regression evidence that summary source data is persisted and failed completion cannot create it.

- [ ] **Step 1: Write failing integration tests**

```ts
test('M21 Slice 5 persists summary facts for a completed partial replacement', async () => {
  // Complete original sets, replace remaining sets, complete replacement, finish.
  // Assert status, both entries, and exactly one provenance record.
});

test('M21 Slice 5 keeps a failed completion active with no completed summary source', async () => {
  // Use the existing atomic completion failure fixture and assert the stored session remains active.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/workout-module.test.ts`

Expected: FAIL because the Slice 5 cases are absent.

- [ ] **Step 3: Add real Web Store/module-service tests**

Use `replaceWorkoutExercise()` and `finishWorkout()`; do not reproduce production logic. Also assert a completed no-Gym Quick Workout retains `gymId === null` in persisted history detail.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/workout-module.test.ts`

Expected: PASS with legacy and Slice 5 cases green.

### Task 3: Summary route and success-only navigation

**Files:**
- Modify: `src/hooks/useWorkoutEngine.ts`
- Modify: `src/components/session/ActiveWorkout.tsx`
- Modify: `app/active-workout.tsx`
- Create: `app/workout-complete.tsx`
- Modify: `app/_layout.tsx`
- Create: `tests/m21-workout-completion-ui.test.ts`

**Interfaces:**
- Consumes: public Workout, Gym, Exercise, and Program services plus Task 1 functions.
- Produces: a finish callback receiving the persisted `WorkoutSession`, and a `/workout-complete` route that renders only persisted completed sessions.

- [ ] **Step 1: Write failing route/architecture tests**

```ts
test('completion route reloads by sessionId through public services', async () => {
  const source = await readFile(resolve(process.cwd(), 'app/workout-complete.tsx'), 'utf8');
  assert.match(source, /getWorkoutHistoryDetail\(sessionId\)/);
  assert.doesNotMatch(source, /store\.(sessions|events|gyms|exercises)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/m21-workout-completion-ui.test.ts`

Expected: FAIL because the completion route does not exist.

- [ ] **Step 3: Write the smallest UI-only integration**

Change the finish callback to receive the resolved completed session. Keep discard routed back without treating it as completion. The new route rejects absent/non-completed sessions, derives metrics through Task 1, resolves names through public services, and exposes View Workout, Train Again, and Home actions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/m21-workout-completion-ui.test.ts`

Expected: PASS with route, reload, source-boundary, and routing assertions green.

### Task 4: Complete verification and bounded release commit

**Files:** all Task 1–3 files plus these design documents.

- [ ] **Step 1: Format changed TypeScript files**

Run: `npx prettier --write <changed TypeScript files>`.

- [ ] **Step 2: Run full required validation**

Run: `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, `npx expo export --platform web`, `git status`.

Expected: all commands exit successfully.

- [ ] **Step 3: Review scope, create one bounded commit, and push**

Run `git diff --check`, commit as `feat: add workout completion summary`, and push `refactor/program-module`.
