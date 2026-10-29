# Auth.1 + Auth.2 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a provider-neutral mobile auth boundary and a Better Auth/PostgreSQL development-test-account foundation without changing GymFlow domain ownership semantics.

**Architecture:** `AuthClientPort` emits only `AuthenticatedPrincipal`; `CurrentUserProvider` resolves it through the existing Domain User service. A separate Hono/Better Auth server owns auth tables and a guarded development test-account route.

**Tech Stack:** Expo SDK 54, React Native, Better Auth, `@better-auth/expo`, expo-secure-store, expo-network, Hono, PostgreSQL, TypeScript, Node test runner.

## Global Constraints

- Only `development` and `test` accept test-account registration; preview/production reject it server-side.
- No phone/SMS implementation, cloud sync replacement, database provisioning, or domain ownership change.
- Never commit `.env`, `DATABASE_URL`, Better Auth secrets, or PostgreSQL credentials.
- Better Auth objects stay outside Program, Workout, Gym, Matching, History, and Social modules.

---

### Task 1: Provider-neutral mobile port

**Files:**
- Create: `src/modules/auth-client/*`
- Modify: `src/modules/current-user/index.tsx`, `src/modules/user/types.ts`, `src/db/storage-bootstrap.native.ts`
- Test: `tests/auth-foundation.test.ts`

- [ ] Write tests proving the `better-auth` principal maps idempotently, current-user does not import Supabase, and missing/error auth does not use `local_default_user` on native.
- [ ] Run the focused test and observe failure due to the missing port/boundary.
- [ ] Implement the narrow port and a development/test client adapter; widen `AuthProvider` to the two allowed provider IDs. Leave Supabase sync isolated from auth startup.
- [ ] Run focused tests and `npx tsc --noEmit`; commit `refactor: add provider-neutral auth client`.

### Task 2: Better Auth server and guarded development accounts

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/.env.example`, `server/src/*`, `server/tests/*`
- Test: server Node tests

- [ ] Write a failing server test for allowed development/test environments and rejected preview/production registrations.
- [ ] Implement environment parsing, Hono server, Better Auth PostgreSQL configuration, and a `/development/test-accounts` endpoint that invokes real Better Auth registration only after the guard passes.
- [ ] Run server typecheck/tests; commit `feat: add better auth development accounts`.

### Task 3: Development UI and operational documentation

**Files:**
- Modify: `src/components/auth/Settings.tsx`, `package.json`, `eas.json`, `docs/auth-provider-replacement-audit.md`
- Create: `docs/auth-development-test-accounts.md`
- Test: `tests/auth-foundation.test.ts`

- [ ] Write a failing UI/config boundary test: development exposes labelled test controls, preview/production do not, and the old Supabase configuration strings are absent.
- [ ] Replace the settings auth path with development-only real account controls and fixed auth base URL configuration. Add root/server run scripts and correct public environment variable names.
- [ ] Document PostgreSQL/server setup, emulator host bridge, A/B switching, production guard, and future verified-phone rule.
- [ ] Run all root and server verification; commit `docs: document development auth testing`.
