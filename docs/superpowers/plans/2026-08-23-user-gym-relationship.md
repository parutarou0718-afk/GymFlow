# M11 User–Gym Relationship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local User–Gym relationship domain for home, favorites, visits/recent, and membership metadata.

**Architecture:** `src/modules/user-gym` validates User and Gym through public semantic dependencies, and only then invokes a narrowed `userGyms` Store port. The native adapter performs Home replacement atomically; the Web adapter exposes identical one-home semantics. A development tab composes only the User, Gym, and User–Gym public APIs.

**Tech Stack:** TypeScript, Expo Router, expo-sqlite, in-memory Web Store, Node tests.

## Global Constraints

- `(userId, gymId)` is unique and all labels live on one record.
- Do not modify Workout, Program, Matching, Auth, Social, Location, or cloud sync.
- Reject relationship mutations for archived users; reject Home and Visit mutations for closed gyms.
- `lastVisitedAt` is monotonic; empty records are automatically removed.

---

### Task 1: Service tests and public contract

**Files:** Create `tests/user-gym-module.test.ts`, `src/modules/user-gym/{types,ports,user-gym-service,index}.ts`; modify `src/db/types.ts`.

- [ ] Write failing tests for Home uniqueness/preservation, multiple favorites, monotonic visits/recent ordering, membership validation/clear, cleanup, and missing/closed entities.
- [ ] Run `npm test` and confirm the test fails because `src/modules/user-gym` does not exist.
- [ ] Implement public types and service methods: `getUserGymRelationship`, `listUserGyms`, `getHomeGym`, `setHomeGym`, `clearHomeGym`, `setFavorite`, `recordGymVisit`, `getRecentGyms`, `setMembership`, `clearMembership`, `removeUserGymRelationship`.
- [ ] Run `npm test` and confirm the service suite passes.

### Task 2: Store parity and migration

**Files:** Modify `src/db/database.ts`, `src/db/web-store.ts`, `src/db/types.ts`.

- [ ] Add failing service test against the Web Store for auto-created relations and cleanup.
- [ ] Add `user_gyms` with `UNIQUE(user_id,gym_id)`, lookup indexes, SQLite transaction-backed Home replacement, and equivalent Web operations.
- [ ] Run `npm test` and confirm parity tests pass.

### Task 3: Development validation UI

**Files:** Create `app/(tabs)/user-gyms.tsx`; modify `app/(tabs)/_layout.tsx`; update `tests/user-gym-module.test.ts`.

- [ ] Write a failing static test requiring three public APIs and rejecting direct `store.users`, `store.gyms`, and `store.userGyms` access.
- [ ] Implement the minimal Current User/Gym relationship manager: Home, Favorite, Visit, Membership, Reload, and Recent list.
- [ ] Run `npm test` and confirm the boundary test passes.

### Task 4: Verify and checkpoint

- [ ] Run `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, `npx expo export --platform web`, and `git diff --check`.
- [ ] Commit only M11 files with `feat: add user gym relationship module`; confirm clean status and stop.
