# Workout Module Extraction Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a framework-independent Workout module that exposes the existing recording workflow through a single public service.

**Architecture:** `src/modules/workout` owns public types, a narrowed Store port, and `createWorkoutService(store)`. The service reuses the current lifecycle helpers and `GymFlowStore`; React screens and `useWorkoutEngine` remain UI coordination only and call the service rather than individual Store methods.

**Tech Stack:** TypeScript, Expo React Native, GymFlowStore, Expo SQLite on native, in-memory Store on Web.

## Global Constraints

- Do not add Gym, Equipment, Matching, Social, or App Shell features.
- Do not import SQLite or Web-store implementation modules from the Workout module.
- Keep native SQLite persistence and Web memory semantics unchanged.
- Record Domain Events only after their corresponding state write succeeds.
- Preserve the existing Workout UI and routes except for replacing direct Store calls with the public API.

---

### Task 1: Create the public boundary

**Files:**
- Create: `src/modules/workout/types.ts`, `ports.ts`, `index.ts`
- Test: `tests/workout-module.test.ts`

- [ ] Export only workout session/template/exercise/set and status types.
- [ ] Define a narrowed Store port based on `GymFlowStore`.
- [ ] Verify consumers import the module public API instead of implementation paths.

### Task 2: Move recording orchestration to WorkoutService

**Files:**
- Create: `src/modules/workout/workout-service.ts`
- Test: `tests/workout-module.test.ts`

- [ ] Add quick/template start, lookup, lifecycle, editing, and history operations.
- [ ] Reuse `workout-lifecycle.ts` and existing Store methods.
- [ ] Persist the state before events; create completion snapshots before returning a completed session.

### Task 3: Make the Engine a coordinator

**Files:**
- Modify: `src/hooks/useWorkoutEngine.ts`
- Test: `tests/workout-module.test.ts`

- [ ] Build a service from `useStores()`.
- [ ] Replace direct Session/Sync/Event Store orchestration with WorkoutService calls.
- [ ] Keep timer, AppState, and UI-facing state in the hook.

### Task 4: Verify the module boundary

**Files:**
- Test: `tests/workout-module.test.ts`, existing test suite

- [ ] Run `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, and a Web export.
- [ ] Review the diff to confirm no Gym/Equipment/Social scope was added.
