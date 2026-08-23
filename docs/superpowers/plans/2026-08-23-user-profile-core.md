# M10 User / Profile Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local stable User/Profile domain with equivalent SQLite and Web-memory behavior, without auth, ownership, User–Gym, or Social behavior.

**Architecture:** `src/modules/user` owns public types, validation, current-user resolution, and service operations. `GymFlowStore.users` is the only persistence dependency; native SQLite and the Web memory store implement one shared contract and bootstrap an immutable stable default user. A small development-only Profile tab consumes only `createUserService(store)`.

**Tech Stack:** TypeScript, Expo Router/React Native, expo-sqlite, in-memory Web Store, Node test runner.

## Global Constraints

- Keep `local_default_user` as the deterministic current domain user; never derive it from Supabase Auth.
- Preserve the legacy root `UserProfile` type untouched; the new canonical profile type lives only in `src/modules/user`.
- Do not add User references to Workout or Program, or introduce User–Gym, Matching personalization, Social, Auth, or cloud synchronization.
- UI must call the User module public API, never `store.users` directly.
- Web persistence is memory-only; native persistence is SQLite with an additive migration and non-destructive bootstrap.

---

### Task 1: Define and test the User module contract

**Files:**
- Create: `tests/user-profile-module.test.ts`
- Create: `src/modules/user/types.ts`
- Create: `src/modules/user/ports.ts`
- Create: `src/modules/user/user-service.ts`
- Create: `src/modules/user/index.ts`
- Modify: `src/db/types.ts`

**Interfaces:**
- Produces `UserProfile`, `CreateUserInput`, `UpdateUserInput`, `UserStorePort`, `DEFAULT_LOCAL_USER_ID`, and `createUserService(store)`.
- `UserService` exposes `getCurrentUser()`, `getUser(id)`, `listUsers()`, `createUser(input)`, `updateUser(id, patch)`, and `archiveUser(id)`.

- [ ] **Step 1: Write failing service tests**

```ts
const service = createUserService(createWebStore());
assert.equal((await service.getCurrentUser()).id, DEFAULT_LOCAL_USER_ID);
await assert.rejects(() => service.createUser({ displayName: '  ' }));
await assert.rejects(() => service.updateUser(DEFAULT_LOCAL_USER_ID, {
  preferences: { defaultRestSeconds: -1 },
}));
```

- [ ] **Step 2: Run `npm test -- tests/user-profile-module.test.ts` and confirm failure because the module and Store port do not exist.**
- [ ] **Step 3: Implement the minimal public types, narrowed port, validation, partial-update normalization, and archive protection.**

```ts
export const DEFAULT_LOCAL_USER_ID = 'local_default_user';
export type UserStorePort = Pick<GymFlowStore, 'users'>;
export function createUserService(store: UserStorePort) { /* public API only */ }
```

- [ ] **Step 4: Run the focused test and make it pass; expand it for create/get, partial update, duplicate-goal normalization, active-only list, normal-user archive, and default-user archive rejection.**

### Task 2: Add native and Web persistence with idempotent bootstrap

**Files:**
- Create: `src/modules/user/seed.ts`
- Modify: `src/db/database.ts`
- Modify: `src/db/web-store.ts`
- Modify: `src/db/types.ts`

**Interfaces:**
- Both stores implement `users.create/get/list/update/archive`.
- `getCurrentUser()` resolves the existing default user or safely bootstraps it once without overwriting a customized record.

- [ ] **Step 1: Add failing tests proving two `getCurrentUser()` calls return one stable default profile and that a Web store rereads saved changes.**
- [ ] **Step 2: Run the focused tests and confirm the missing persistence implementation is the cause of failure.**
- [ ] **Step 3: Add the `users` SQLite table using `CREATE TABLE IF NOT EXISTS`, row mappers/JSON serialization, `INSERT OR IGNORE` default bootstrap, and matching cloned Web-memory operations.**

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_uri TEXT,
  experience_level TEXT NOT NULL,
  training_goals_json TEXT NOT NULL,
  preferences_json TEXT NOT NULL,
  privacy_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

- [ ] **Step 4: Run focused tests until green, then run `npm test` before moving on.**

### Task 3: Add the development-only Profile validation page

**Files:**
- Create: `app/(tabs)/profile.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `tests/user-profile-module.test.ts`

**Interfaces:**
- Page creates `UserService` from `useStores()` and calls only its public methods.
- Page reloads after save and displays the persisted current profile.

- [ ] **Step 1: Write a static boundary test asserting the page imports the User module and does not access `store.users`.**
- [ ] **Step 2: Run the focused test and confirm it fails because the page does not exist.**
- [ ] **Step 3: Implement the minimal form for current ID, display name, experience level, multi-goal toggles, units, intent, rest seconds, and the three privacy defaults; Save and Reload each use the service.**
- [ ] **Step 4: Run the focused test and manually exercise Save → Reload on Web; do not alter the existing Auth Settings skeleton.**

### Task 4: Verify, document, and checkpoint M10

**Files:**
- Modify only if existing architecture documentation is found in the repository; do not add external documents.

- [ ] **Step 1: Re-read the M10 PRD and check every in-scope and out-of-scope requirement against implementation and tests.**
- [ ] **Step 2: Run `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, and `npx expo export --platform web`.**
- [ ] **Step 3: Inspect `git diff --check` and `git status --short`; commit only the M10 files with `feat: add user profile core module`.**
- [ ] **Step 4: Verify the committed tree is clean and report the identity audit, module/public API, model, persistence parity, bootstrap, validation, UI, test count, command results, and commit hash. Stop after the report.**
