# M1 Workout Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize durable Workout Sessions across Quick Workout, pause/resume, completion/discard, editing, and local domain events.

**Architecture:** Extend the existing store contract and make both SQLite and Web implementations conform. Derive timer display from persisted lifecycle timestamps, keep UI as a thin engine consumer, and record event/analytics calls at lifecycle transitions.

**Tech Stack:** Expo SDK 54, TypeScript, React Native, Expo SQLite, React Native Web, Node built-in tests via tsx.

## Global Constraints

- Keep Gym, equipment, matching, social, cloud sync, and real analytics out of scope.
- Web data remains in memory and resets on refresh.
- Android/iOS retain SQLite persistence and receive additive schema migration only.
- `gymId` is null and `visibility` is private for every M1-created session.
- Do not add page-level storage platform branches.

---

### Task 1: Model durable lifecycle and event storage

**Files:** `src/types/index.ts`, `src/db/types.ts`, `src/db/database.ts`, `src/db/web-store.ts`, `src/lib/analytics.ts`, `tests/workout-lifecycle.test.ts`

**Produces:** persisted `pausedAt`, `completedAt`, source metadata, discarded state, event records, and matching Web behavior.

- [ ] Write tests asserting pause/resume accumulation, completion while paused, discard exclusion from history, and one event per successful transition.
- [ ] Run `npm test -- tests/workout-lifecycle.test.ts`; expect failure because the lifecycle API is absent.
- [ ] Add `discarded` to session status; add `pausedAt`, `completedAt`, source fields, gym and visibility fields; add `DomainEvent` and an event store to `GymFlowStore`.
- [ ] Upgrade SQLite schema additively, mapping `completedAt` to `finished_at`; add `domain_events`; migrate old completed rows without data loss.
- [ ] Implement matching in-memory lifecycle/event state in `WebGymFlowStore`.
- [ ] Add a no-op `Analytics.track(eventName, properties)` implementation.
- [ ] Re-run lifecycle tests and `npx tsc --noEmit`; expect PASS.

### Task 2: Rebuild the workout engine around persisted time and editable sessions

**Files:** `src/hooks/useWorkoutEngine.ts`, `src/db/types.ts`, `src/db/database.ts`, `src/db/web-store.ts`, `tests/workout-engine.test.ts`

**Produces:** quick-session initialization, resume-safe elapsed time, session exercise/set editing, complete and discard actions.

- [ ] Write tests for creating a quick session with `templateId = null`, computing elapsed time from timestamps, and reloading a paused session.
- [ ] Run the tests; expect failure from the current template-only engine.
- [ ] Add store methods for session exercise insertion/removal/reorder and set insertion/removal.
- [ ] Make engine initialization create either template-derived or empty quick sessions and record `WORKOUT_STARTED`.
- [ ] Replace transient pause references with persisted timestamp transitions; derive elapsed display from session data and a UI tick.
- [ ] Implement completion confirmation target action and discard action, including event and no-op analytics emission.
- [ ] Re-run tests and TypeScript check; expect PASS.

### Task 3: Expose M1 workout controls in the UI and validate flows

**Files:** `src/components/session/ActiveWorkout.tsx`, `src/components/session/ExerciseBlock.tsx`, `src/components/session/PauseOverlay.tsx`, `app/active-workout.tsx`, `tests/web-store.test.ts`

**Produces:** a usable empty Quick Workout, exercise and set controls, complete/discard confirmation, and paused-session recovery UI.

- [ ] Write focused tests for the store methods that back add/remove/reorder controls.
- [ ] Run tests and observe missing APIs.
- [ ] Add exercise picker entry point to active workout; allow add/remove/reorder exercises and add/remove sets; preserve set weight/reps/completion editing.
- [ ] Add Finish and Discard confirmations; make paused overlay expose Resume, Finish, and Discard.
- [ ] Ensure active-workout route loads an existing session without requiring a template.
- [ ] Run `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, and `npx expo start --web`; walk scenarios A-E in the browser.
- [ ] Commit with `feat: stabilize workout sessions`.

## Plan Self-Review

- Task 1 covers persistent state, events, analytics boundary, Web/native store parity, and history/statistics filtering.
- Task 2 covers Quick Workout, persisted pause/resume, duration calculation, completion, discard, and engine boundaries.
- Task 3 covers all user-visible controls and the PRD acceptance scenarios.
- No Gym, social, cloud, matching, or production analytics work is included.
