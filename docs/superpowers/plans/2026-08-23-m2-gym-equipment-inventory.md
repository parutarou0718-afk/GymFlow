# M2 Gym, Equipment, and Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent Gym, Equipment, and Gym Inventory modules with equivalent SQLite and Web-memory behavior.

**Architecture:** Each module exposes public types, a narrowed Store port, and a service factory. `GymFlowStore` gains three storage capabilities; SQLite owns normalized tables and foreign keys, while the Web store provides matching in-memory semantics and seed equipment.

**Tech Stack:** Expo SDK 54, TypeScript, Expo SQLite, React Native, Web Memory Store.

## Global Constraints

- Do not implement maps, GPS, matching, Exercise–Equipment relations, Social, or merchant features.
- Keep Workout independent; `WorkoutSession.gymId` remains optional and no Workout code queries Gym data.
- Gym, Equipment, and Inventory must remain separate responsibilities.
- Use `GymFlowStore`; services must not import SQLite or Web implementations.
- Keep Native and Web storage behavior equivalent.

---

### Task 1: Define public types, Store ports, and service tests

**Files:**
- Create: `src/modules/{gym,equipment,gym-inventory}/{types,ports,*-service,index}.ts`
- Modify: `src/db/types.ts`
- Test: `tests/m2-modules.test.ts`

- [ ] Write failing service tests for Gym CRUD/archive, Equipment alias search/archive, and cross-gym Inventory reuse/validation.
- [ ] Add public types and Store interfaces without SQLite imports.
- [ ] Implement services against narrowed ports and verify tests pass with the Web Store.

### Task 2: Add matching Native and Web storage

**Files:**
- Modify: `src/db/database.ts`, `src/db/web-store.ts`, `src/db/types.ts`
- Test: `tests/m2-modules.test.ts`

- [ ] Add normalized SQLite tables, foreign keys, unique Gym/Equipment inventory relation, and archive fields.
- [ ] Add Store factory mappings and Web seed equipment data.
- [ ] Verify create, search, inventory update, and invalid-reference rejection through module services.

### Task 3: Add minimum M2 validation UI

**Files:**
- Create: `app/(tabs)/gyms.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] Provide a Gym list, Gym creation, Equipment search, inventory add/remove, and quantity editing view.
- [ ] Compose module APIs only; do not add map, matching, or Workout coupling.

### Task 4: Validate and commit

**Files:**
- Test: all existing tests plus `tests/m2-modules.test.ts`

- [ ] Run `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, and Web build/start validation.
- [ ] Review Store method use and report module boundaries and schema.
