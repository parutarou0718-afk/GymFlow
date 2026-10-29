# M22.1 Production Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind authenticated principals to stable Domain Users and make private product reads and flows owner-scoped for a controlled Private Beta.

**Architecture:** A provider-neutral auth adapter produces an `AuthenticatedPrincipal`; a current-user provider resolves it idempotently to a persisted Domain User mapping. Product UI obtains one explicit `userId` from that boundary, while domain services remain provider-agnostic and use owner-scoped Program and Workout APIs backed by the existing shared SQLite/Web Store.

**Tech Stack:** Expo Router, React Native/React context, TypeScript, Supabase auth adapter, SQLite/Web Store, Node test runner.

## Global Constraints

- Implement M22.1 only; do not begin M22.2 or cloud sync/RLS/native build/observability work.
- Supabase types/imports stay outside Program, Workout, Gym, Matching, Social, and Sharing business modules.
- `DEFAULT_LOCAL_USER_ID` is only for tests or the explicit Web local-demo adapter; product screens must not import it.
- Private lists and detail/get-by-id reads require explicit `userId` and verify `ownerUserId`.
- Shared resources retain existing Sharing/Social visibility paths.
- Workout completion records a visit using `WorkoutSession.ownerUserId`.
- Social UI is centrally feature-gated off; the domain and tests remain.
- Keep M21 semantics unchanged: session Gym authority, program immutability, explicit replacement decisions, stale guards, and atomic completion.

---

### Task 1: Persist an idempotent provider-to-Domain-User mapping

**Files:**
- Modify: `src/modules/user/types.ts`, `src/modules/user/user-service.ts`, `src/modules/user/index.ts`
- Modify: `src/db/types.ts`, `src/db/web-store.ts`, `src/db/*native*`, migration/bootstrap files
- Test: `tests/m22-production-identity.test.ts`

**Interfaces:**
- Produces `AuthenticatedPrincipal`, `UserService.resolveAuthenticatedUser(principal)`, and store lookup by `(authProvider, authSubject)`.

- [ ] Write a failing test that resolves principal A twice and asserts the same active Domain User id, then resolves principal B and asserts a different id.
- [ ] Run the focused test and confirm it fails because the resolver/mapping does not exist.
- [ ] Add nullable additive auth mapping fields, migration support, and a lookup that never creates duplicate mappings.
- [ ] Implement the smallest provider-neutral resolver; do not import Supabase in UserService.
- [ ] Run the focused test and confirm it passes.

### Task 2: Establish the current-user application boundary

**Files:**
- Create: `src/modules/current-user/*`
- Modify: `src/lib/supabase.ts`, `src/lib/supabase.web.ts`, `app/_layout.tsx`, auth settings/gate components
- Test: `tests/m22-production-identity.test.ts`, static architecture test

**Interfaces:**
- Consumes `UserService.resolveAuthenticatedUser(principal)`.
- Produces `CurrentUserProvider`, `useCurrentUser()`, explicit authenticated/loading/logged-out/error states.

- [ ] Write a failing service/provider-level account-switch test for A → clear → B that asserts B is the new actor and not A.
- [ ] Run it and confirm it fails because no current-user boundary exists.
- [ ] Implement an adapter-normalized principal reader and current-user context; native logged-out state is explicit and Web local demo is isolated to the adapter.
- [ ] Replace runtime screen uses of `DEFAULT_LOCAL_USER_ID` with `useCurrentUser().user.id`; block user-scoped loading until ready.
- [ ] Add a central `socialEnabled` feature flag and hide Social UI only through that flag.
- [ ] Run the focused test and static boundary checks.

### Task 3: Owner-scope private Program reads and creation

**Files:**
- Modify: `src/modules/program/program-service.ts`, Program consumers and app screens
- Test: `tests/m22-production-identity.test.ts`

**Interfaces:**
- Produces `listProgramsForOwner(userId)` and `getProgramForOwner(userId, programId)`; missing/non-owned records return `null`.

- [ ] Write failing tests showing A's normal list/detail excludes B's private Program while each principal's creation stores its own `ownerUserId`.
- [ ] Run focused tests and observe cross-owner exposure in the existing raw APIs.
- [ ] Implement owner-scoped private APIs and migrate product list/detail flows to them. Preserve explicit Sharing/Social raw visibility paths.
- [ ] Run focused Program isolation tests.

### Task 4: Owner-scope private Workout and History reads

**Files:**
- Modify: `src/modules/workout/workout-service.ts`, workout/history hooks and screens, training-flow callers as needed
- Test: `tests/m22-production-identity.test.ts`

**Interfaces:**
- Produces owner-scoped Workout detail, active session, history, history detail, and statistics reads.

- [ ] Write failing tests showing A cannot retrieve B's workout by ID or in History, and A's quick/program workouts retain A ownership after switching to B.
- [ ] Run the focused tests and observe the existing unscoped behavior.
- [ ] Implement owner-scoped private APIs and migrate product runtime callers. Preserve internal atomic persistence behavior.
- [ ] Change completion Visit recording to `persisted.ownerUserId`; add a test that completion after identity changes still writes the session owner's visit.
- [ ] Run focused Workout ownership/isolation tests.

### Task 5: Scope Gym Context and User-Gym runtime flows

**Files:**
- Modify: Home, Current Gym, Gym Detail, Gym Picker, replacement/program flows and relevant hooks
- Test: `tests/m22-production-identity.test.ts`

**Interfaces:**
- Consumes current-user `userId`; existing GymContext/UserGym service methods remain explicit-user APIs.

- [ ] Write a failing A/B test giving each user a different Current Gym, Home/recent/visit relationship, then switching and asserting each resolves only its own data.
- [ ] Run the focused test and confirm runtime call sites still use the local-default constant.
- [ ] Pass current user identity through product flows without putting mutable current-user state in domain services.
- [ ] Run the focused Gym isolation test and M21 Training Flow regression tests.

### Task 6: Verify boundaries, document, and release the bounded slice

**Files:**
- Modify: `tests/m22-production-identity.test.ts`, relevant static-boundary test files
- Create: `docs/m22-production-identity.md`

- [ ] Add static checks that product runtime screens do not import `DEFAULT_LOCAL_USER_ID` and business modules do not import Supabase.
- [ ] Run focused tests, then the complete required validation suite.
- [ ] Review `git diff` to confirm the change excludes M22.2+ work and contains no Supabase imports in business modules.
- [ ] Commit all M22.1 changes once as `feat: bind auth identity to domain users`.
