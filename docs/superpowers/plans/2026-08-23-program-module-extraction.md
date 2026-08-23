# Program Module Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an independent Program public API over existing WorkoutTemplate persistence and migrate Plan UI consumers to it without data migration.

**Architecture:** `src/modules/program` owns Program terminology, a narrow storage port, and CRUD coordination. It delegates to the existing `templates` storage implementation so SQLite/Web data and IDs remain unchanged. UI creates the service from the composite store and never reads `store.templates` itself.

**Tech Stack:** TypeScript, Expo Router, React Native, SQLite, in-memory Web store, Node test runner.

## Global Constraints

- Keep `WorkoutTemplate`, `templates`, and every existing program/template ID unchanged.
- Do not modify Workout, Matching, History, Social, maps, or UI layout/behavior.
- Use the Program public API for Plan list and template form reads/writes.
- Do not implement History → Save as Program or Program-level Gym Matching.

---

### Task 1: Define and prove the Program public API

**Files:**
- Create: `src/modules/program/types.ts`
- Create: `src/modules/program/ports.ts`
- Create: `src/modules/program/program-service.ts`
- Create: `src/modules/program/index.ts`
- Test: `tests/program-module.test.ts`

**Interfaces:**
- Consumes: `GymFlowStore.templates` through a `ProgramStore` port and existing `WorkoutTemplate` types.
- Produces: `createProgramService(store)` with `listPrograms`, `getProgram`, `createProgram`, `updateProgram`, and `deleteProgram`.

- [ ] **Step 1: Write the failing test**

```ts
import { createProgramService } from '../src/modules/program';

test('ProgramService preserves existing IDs while delegating CRUD to template persistence', async () => {
  const service = createProgramService(createWebStore());
  const program = { id: 'program-id', name: 'Push', exercises: [], createdAt: 1, updatedAt: 1 };
  assert.equal((await service.createProgram(program)).id, 'program-id');
  assert.equal((await service.getProgram('program-id'))?.name, 'Push');
  assert.equal((await service.listPrograms()).some(item => item.id === 'program-id'), true);
});
```

- [ ] **Step 2: Run the focused test and verify it fails because `src/modules/program` does not exist**

Run: `npx tsx --test tests/program-module.test.ts`

- [ ] **Step 3: Implement the minimal public module**

```ts
export type Program = WorkoutTemplate;
export type ProgramStore = Pick<GymFlowStore, 'templates'>;
export function createProgramService(store: ProgramStore) {
  return {
    listPrograms: () => store.templates.getAll(),
    getProgram: (id: string) => store.templates.get(id),
    async createProgram(program: Program) { await store.templates.create(program); return program; },
    async updateProgram(program: Program) { await store.templates.update(program); return program; },
    deleteProgram: (id: string) => store.templates.delete(id),
  };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx tsx --test tests/program-module.test.ts`

### Task 2: Move Plans and template editor to the public API

**Files:**
- Modify: `app/(tabs)/plans.tsx`
- Modify: `app/template-form.tsx`
- Modify: `tests/program-module.test.ts`

**Interfaces:**
- Consumes: `createProgramService(store)` from `src/modules/program`.
- Produces: UI consumers with no `store.templates` access.

- [ ] **Step 1: Add the failing boundary assertions**

```ts
const plans = await readFile(resolve(process.cwd(), 'app/(tabs)/plans.tsx'), 'utf8');
const form = await readFile(resolve(process.cwd(), 'app/template-form.tsx'), 'utf8');
assert.match(plans, /createProgramService/);
assert.doesNotMatch(plans, /store\.templates|\{ templates \} = useStores/);
assert.match(form, /createProgramService/);
assert.doesNotMatch(form, /store\.templates|\{ templates \} = useStores/);
```

- [ ] **Step 2: Run the focused test and verify it fails on the direct store access**

Run: `npx tsx --test tests/program-module.test.ts`

- [ ] **Step 3: Replace direct repository calls with public API calls**

```ts
const store = useStores();
const programs = useMemo(() => createProgramService(store), [store]);
const list = await programs.listPrograms();
await programs.createProgram(program);
```

- [ ] **Step 4: Run the focused test and TypeScript check**

Run: `npx tsx --test tests/program-module.test.ts; npx tsc --noEmit`

### Task 3: Validate compatibility and commit

**Files:**
- Modify: `tests/program-module.test.ts`

- [ ] **Step 1: Extend the Program test to update, delete, and read an existing seeded Program by its original ID**

```ts
const existing = (await service.listPrograms())[0]!;
await service.updateProgram({ ...existing, name: 'Updated' });
assert.equal((await service.getProgram(existing.id))?.name, 'Updated');
await service.deleteProgram('program-id');
assert.equal(await service.getProgram('program-id'), null);
```

- [ ] **Step 2: Run all verification commands**

Run: `npm test; npx tsc --noEmit; npx expo-doctor; npx expo export --platform web`

- [ ] **Step 3: Commit the completed extraction**

```bash
git add src/modules/program app/(tabs)/plans.tsx app/template-form.tsx tests/program-module.test.ts docs/superpowers
git commit -m "refactor: extract program module"
```
