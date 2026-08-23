# Core Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Home dashboard's persistence leakage, establish a non-destructive ordered SQLite migration ledger, and make Workout completion atomic on Native and Web.

**Architecture:** Preserve existing physical storage and IDs. Home composes only Workout and Program public services. A ledger recognizes old `schema_version = 1` installations as a compatibility baseline and advances only missing, ordered migrations; fresh installations begin at version 0 and execute the same ledger. Workout completion delegates one composed write to a narrowly scoped persistence port rather than independently updating session, outbox, and event stores.

**Tech Stack:** TypeScript, Expo SQLite, in-memory Web Store, Node built-in test runner via `tsx`.

## Global Constraints

- Do not delete, recreate, rename, or migrate the existing `templates` table or existing IDs.
- Do not modify Auth, Supabase identity mapping, Cloud Sync architecture, Social, Location, Program storage, or UI layout.
- Native and Web completion semantics must remain equivalent.
- All new behavior begins with a failing regression test.
- Final verification: `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, and Web export/build.

---

### Task 1: Home public-read boundary

**Files:**
- Modify: `src/modules/workout/workout-service.ts`
- Modify: `app/(tabs)/index.tsx`
- Modify: `tests/web-import-safety.test.ts`

**Interfaces:**
- Produces `WorkoutService.getWorkoutStats(): Promise<{ workouts: number; volume: number }>`.
- Home consumes `createWorkoutService(store)` and `createProgramService(store)` only for dashboard reads.

- [x] **Step 1: Write the failing static boundary test**

Assert that Home imports both public services and no longer references `store.sessions`, `store.templates`, or destructures those Store ports.

- [x] **Step 2: Run the focused test and observe the expected failure**

Run: `npm test -- tests/web-import-safety.test.ts`

- [x] **Step 3: Add the minimal Workout read API and route Home through both services**

Keep the existing four persisted reads behind `WorkoutService` and `ProgramService`; do not alter rendered data or page layout.

- [x] **Step 4: Re-run the focused test**

Run: `npm test -- tests/web-import-safety.test.ts`

### Task 2: Ordered SQLite migration ledger

**Files:**
- Create: `src/db/migrations.ts`
- Modify: `src/db/database.ts`
- Create: `tests/migration-ledger.test.ts`

**Interfaces:**
- Produces `LATEST_SCHEMA_VERSION` and a testable `runMigrationLedger` function.
- Existing databases with `schema_version = 1` run only versions after the declared compatibility baseline.
- Fresh databases write version 0 then apply every ordered migration once.

- [x] **Step 1: Write failing ledger tests**

Use an in-memory ledger adapter to verify ordered versions run once, repeated initialization makes no second migration call, and a current-M11 compatibility baseline does not rerun its historical baseline migration.

- [x] **Step 2: Run the focused test and observe the expected failure**

Run: `npm test -- tests/migration-ledger.test.ts`

- [x] **Step 3: Implement the pure ledger and Native adapters**

Move only the existing conditional column additions and canonical User bootstrap compatibility steps into ordered, idempotent migrations. Retain all `CREATE TABLE IF NOT EXISTS` statements and current seed behavior. Never issue destructive SQL.

- [x] **Step 4: Re-run the focused test**

Run: `npm test -- tests/migration-ledger.test.ts`

### Task 3: Atomic Workout completion port

**Files:**
- Modify: `src/db/types.ts`
- Modify: `src/modules/workout/ports.ts`
- Modify: `src/modules/workout/workout-service.ts`
- Modify: `src/db/database.ts`
- Modify: `src/db/web-store.ts`
- Modify: `tests/workout-module.test.ts`

**Interfaces:**
- Produces `WorkoutCompletionStore.complete(input)` as the only persistence operation used by `WorkoutService.finishWorkout` for completion/session snapshot/outbox/event writes.
- Native implementation uses one SQLite transaction.
- Web implementation stages clones and assigns state only after every staged write can succeed.

- [x] **Step 1: Write failing atomic completion tests**

Create an injected completion port that throws at the session, outbox, and event stages. Each failure must leave the real session active, completion history absent, sync queue unchanged, and no `WORKOUT_COMPLETED` event.

- [x] **Step 2: Run the focused test and observe expected failures**

Run: `npm test -- tests/workout-module.test.ts`

- [x] **Step 3: Add the narrow port and replace sequential completion writes**

The service computes completion/snapshot/event first and calls the port exactly once. Native wraps the three SQL writes in a transaction; Web clone-stages all state before a single commit.

- [x] **Step 4: Re-run focused tests**

Run: `npm test -- tests/workout-module.test.ts && npm test -- tests/web-store.test.ts`

### Task 4: Full verification and checkpoint

**Files:**
- Modify: `docs/superpowers/plans/2026-08-23-core-hardening.md` (mark completed steps)

- [x] **Step 1: Review diff against scope**

Run: `git diff --check` and `git diff --stat`; confirm no forbidden modules changed.

- [x] **Step 2: Run required verification**

Run: `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, and the project Web export/build command.

- [x] **Step 3: Commit the independent checkpoint**

Run: `git add ... && git commit -m "feat: harden core persistence boundaries"`
