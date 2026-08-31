# M21 Slice 4 Active Workout Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productize in-Workout contextual replacement while retaining existing service-owned replacement semantics.

**Architecture:** `ActiveWorkout` remains a thin UI orchestrator. It constructs existing public services, resolves session Gym display data through `GymService`, invokes `WorkoutReplacementService`, and refreshes `useWorkoutEngine` only after successful replacement. Existing Workout and replacement modules are not modified.

**Tech Stack:** React Native, TypeScript, Expo Router, node:test, Web Store integration fixtures.

## Global Constraints

- `WorkoutSession.gymId` is the sole replacement Gym authority; never use Current Gym.
- No new public API, direct Store reads, candidate re-ranking, automatic candidate selection, or Inventory mutation.
- Existing zero/partial replacement, completed-set immutability, pending-set migration, provenance, events, and atomic persistence are unchanged.
- Replacement availability derives only from current session-set completion facts.

---

### Task 1: Lock service-level Slice 4 invariants

**Files:**
- Modify: `tests/m18-workout-replacement.test.ts`
- Modify: `tests/workout-module.test.ts`

- [ ] Add a Web Store test that starts at Gym A, changes Current Gym to B, and proves replacement candidates/mutation use Gym A and retain the session Gym.
- [ ] Extend zero-completed and partial-completed tests to exercise the public replacement service around existing Workout mutation, including no-candidate no-mutation and occupied-reason Inventory non-mutation.
- [ ] Run `npm test -- --test-name-pattern "M21 Slice 4|M18"` and require green results before UI changes.

### Task 2: Productize Active Workout replacement UI

**Files:**
- Modify: `src/components/session/ActiveWorkout.tsx`
- Modify: `src/components/session/ExerciseBlock.tsx`
- Create: `tests/m21-active-workout-replacement-ui.test.ts`

- [ ] Write source-boundary tests for Gym public-service resolution, Workout Replacement public-service use, no direct Store repositories, named candidate fallback, and pending-only replacement entry.
- [ ] Add session Gym header display and user-facing reason labels; render named candidates with explicit selection and no raw candidate metadata.
- [ ] Add partial-replacement explanatory copy before confirmation and a no-candidate blocker with Close/continue behavior.
- [ ] Run `npm test -- --test-name-pattern "M21 Active Workout"` and `npx tsc --noEmit`.

### Task 3: Final validation and commit

**Files:** all Task 1–2 files only.

- [ ] Run `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, `npx expo export --platform web`, and `git status`.
- [ ] Commit with `feat: productize active workout replacement` only when all validation passes.
