# GymFlow Web Development Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run GymFlow in an Expo Web browser preview using reset-on-refresh demo data while keeping native SQLite storage unchanged.

**Architecture:** Keep `GymFlowStore` as the page-facing contract. Introduce platform-selected store factories: native imports the existing SQLite factory and web imports a module-scoped in-memory implementation seeded once per browser load. Root startup must avoid calling native database and sync initialization on web.

**Tech Stack:** Expo SDK 54, Expo Router, React Native Web, React 19, TypeScript, Expo SQLite (native only).

## Global Constraints

- Install Web dependencies only through `npx expo install react-dom react-native-web @expo/metro-runtime`.
- Web data is in memory only; do not use localStorage, IndexedDB, browser SQLite, or Supabase.
- Browser refresh must restore seed data.
- Android and iOS must continue using the existing `createStore()` SQLite implementation.
- Do not add `Platform.OS` branches in pages or components; platform selection belongs at the Store Provider/factory boundary.
- Quick Workout and pause/resume fixes are out of scope.

---

## File Structure

- Create: `src/db/web-store.ts` — in-memory `GymFlowStore` implementation and deterministic demo data.
- Create: `src/db/store-factory.ts` — selects the existing SQLite or in-memory Web store at the storage boundary.
- Modify: `src/db/stores.tsx` — obtains `GymFlowStore` from the platform-selected factory.
- Modify: `app/_layout.tsx` — limits database initialization and automatic sync to native platforms.
- Modify: `package.json`, `package-lock.json` — Expo-managed Web runtime dependencies.
- Modify: `.gitignore` — exclude Expo, Node, native, and local secret artifacts as needed without excluding tracked source.
- Create: `docs/superpowers/specs/2026-08-22-web-preview-design.md` — approved design.
- Create: `docs/superpowers/plans/2026-08-22-web-development-preview.md` — this implementation plan.

### Task 1: Install the Expo Web runtime and initialize repository hygiene

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `.git/` through `git init`

**Consumes:** Expo SDK `~54.0.0` project configuration in `package.json`.

**Produces:** An Expo-supported browser runtime and a Git repository ready for the final implementation commit.

- [ ] **Step 1: Install the Expo-selected Web dependencies**

Run:

```powershell
npx expo install react-dom react-native-web @expo/metro-runtime
```

Expected: `package.json` and `package-lock.json` include compatible versions, with no manual version pinning.

- [ ] **Step 2: Verify the dependency graph is valid**

Run:

```powershell
npx expo-doctor
```

Expected: no dependency mismatch failure. If Expo Doctor identifies another SDK 54 patch-level mismatch, apply only the exact `expo install` recommendation and rerun it.

- [ ] **Step 3: Initialize Git and preserve generated files**

Run:

```powershell
git init
```

Ensure `.gitignore` includes these entries when not already covered:

```gitignore
node_modules/
.expo/
dist/
web-build/
*.jks
*.keystore
*.p8
*.p12
*.key
*.mobileprovision
.env
.env.*
```

- [ ] **Step 4: Record the verification result**

Run:

```powershell
npx tsc --noEmit
git status --short
```

Expected: TypeScript passes; Git reports only intentional setup and documentation changes.

### Task 2: Add the isolated Web store and deterministic seed data

**Files:**
- Create: `src/db/web-store.ts`
- Modify: `src/db/types.ts` only if a type needed by the Web store is missing

**Consumes:** `GymFlowStore`, `WorkoutTemplate`, `WorkoutSession`, `WorkoutSnapshot`, and `SyncQueueItem` from `src/db/types.ts` and `src/types/index.ts`.

**Produces:** `createWebStore(): GymFlowStore`, with in-memory template, session, and sync-queue behavior.

- [ ] **Step 1: Define an executable store behavior checklist before implementation**

Create a temporary test matrix in the implementation PR/commit notes and verify these calls manually in the browser after Task 4:

```text
templates.getAll() returns at least two demo templates
templates.create/update/delete changes getAll() during the current page lifetime
sessions.getAll() returns at least one completed seeded session
sessions.getTotalWorkouts() and getTotalVolume() match seeded completed sessions
sync.saveSnapshot() adds a pending item retrievable with sync.getPending()
```

- [ ] **Step 2: Implement deterministic demo data**

In `src/db/web-store.ts`, define seed templates and one completed session with exercise objects, sets, timestamps, and consistent totals. Use explicit stable IDs such as `web-template-push`, `web-template-pull`, and `web-session-demo-1`; do not generate seed IDs at runtime. Keep no active or paused seed session.

- [ ] **Step 3: Implement the Web store contract**

Export this exact function:

```ts
export function createWebStore(): GymFlowStore
```

The module owns mutable arrays initialized from deep clones of the seed data. Implement every method in `SessionStore`, `TemplateStore`, and `SyncStore` as `async` methods. `sessions.updateSet` locates a session exercise by its ID across all sessions; `sessions.updateStatus` merges the documented `extra` fields; totals include completed sessions only. `sync.saveSnapshot` updates the corresponding session snapshot state and adds one pending queue entry.

- [ ] **Step 4: Keep preview data reset-on-refresh**

Do not import storage APIs. Do not write a reset method. The module-scoped store is recreated by the browser bundle after a refresh, restoring the seed clones automatically.

### Task 3: Select storage by platform without page-level branching

**Files:**
- Create: `src/db/store-factory.ts`
- Modify: `src/db/stores.tsx`

**Consumes:** `createStore(): GymFlowStore` from `src/db/database.ts` and `createWebStore(): GymFlowStore` from `src/db/web-store.ts`.

**Produces:** `createPlatformStore(): GymFlowStore` resolved at the central storage boundary.

- [ ] **Step 1: Create the central platform factory**

Add `src/db/store-factory.ts` using `Platform.OS` and deferred `require()` calls. The `web` branch returns `createWebStore()` and the native branch returns `createStore()`. This is the only platform branch in the storage selection path and keeps TypeScript able to resolve the generic factory module.

- [ ] **Step 2: Move selection into the provider**

Replace the direct `createStore` import in `src/db/stores.tsx` with:

```ts
import { createPlatformStore } from './store-factory';
```

Then initialize the provider using `createPlatformStore()`. Do not change `useStores()` or any caller.

- [ ] **Step 3: Type-check the platform boundary**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

### Task 4: Make root startup safe on Web and validate the complete preview path

**Files:**
- Modify: `app/_layout.tsx`

**Consumes:** existing native `getDatabase()` and `processSyncQueue()` startup calls; platform-selected `StoreProvider` from Task 3.

**Produces:** a root layout that does not initialize native SQLite or Supabase synchronization in a browser.

- [ ] **Step 1: Make native startup imports platform-safe**

In `app/_layout.tsx`, use `Platform` and a native-only dynamic import inside the startup effect. The web branch must return before importing `../src/db/database` or `../src/lib/supabase`.

```ts
useEffect(() => {
  if (Platform.OS === 'web') return;

  void Promise.all([
    import('../src/db/database'),
    import('../src/lib/supabase'),
  ]).then(async ([database, supabase]) => {
    await database.getDatabase();
    await supabase.processSyncQueue();
  }).catch(console.error);
}, []);
```

- [ ] **Step 2: Validate Web startup**

Run:

```powershell
npx expo start --web
```

Expected: Metro reports a browser URL and no missing `react-native-web` dependency error.

- [ ] **Step 3: Run the browser acceptance walkthrough**

In the browser, verify:

```text
Home shows demo stats and recent templates.
Plans shows demo plans.
Create a plan, edit it, copy it, and delete it; each result is visible before refresh.
Start a seeded plan, change a set value, mark a set complete, then finish it.
History shows the seeded session and the newly completed session.
Settings renders without storage or SQLite errors.
Refresh the page; created/edited preview data is gone and initial seeds return.
```

- [ ] **Step 4: Run final automated checks**

Run:

```powershell
npx tsc --noEmit
npx expo-doctor
```

Expected: both pass.

### Task 5: Record the finished preview baseline

**Files:**
- Modify: all intentional files from Tasks 1-4

**Consumes:** passing checks and browser walkthrough from Task 4.

**Produces:** the first traceable Git commit for the project.

- [ ] **Step 1: Inspect all changes**

Run:

```powershell
git status --short
git diff --check
```

Expected: no whitespace errors and no sensitive Supabase configuration values.

- [ ] **Step 2: Create the baseline commit**

Run:

```powershell
git add .
git commit -m "chore: add web development preview"
git rev-parse --short HEAD
```

Expected: commit succeeds and outputs a short commit hash.

## Plan Self-Review

- Spec coverage: Task 1 adds Expo Web support and Git hygiene; Task 2 creates reset-on-refresh in-memory data and seed content; Task 3 confines platform selection to the store boundary; Task 4 prevents web native initialization and validates all requested screens and flows; Task 5 records the requested baseline commit.
- Placeholder scan: no incomplete requirements or deferred implementation steps remain in this plan.
- Type consistency: `store-factory.ts` exports `createPlatformStore(): GymFlowStore`; `web-store.ts` exports `createWebStore(): GymFlowStore`; existing `StoreProvider` callers remain unchanged.
