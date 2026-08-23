# M12 Location Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add validated Gym geography and a provider-agnostic Location Core for distance and nearby existing GymFlow gyms.

**Architecture:** Geographic fields remain Gym-owned and use the existing `gyms` table. The Location module depends only on injected `LocationProvider` and Gym public API; its default provider is deliberately not configured. The migration ledger receives the next additive version so older databases gain missing geography columns without renaming `templates` or rebuilding data.

**Tech Stack:** TypeScript, Expo SQLite, Web in-memory Store, Expo Router, Node built-in test runner via `tsx`.

## Global Constraints

- No Expo GPS, permissions, maps, Places API, geocoding, external discovery, check-in, current Gym, or background location.
- No Workout, User–Gym, Matching, Auth, Cloud, Social, or Program storage integration.
- Gym geography is optional; latitude and longitude must be both present or both absent.
- Location reads Gym data only through Gym public API.
- Current device location is never persisted.
- Preserve existing `templates` table, stable IDs, and existing data.

---

### Task 1: Geographic validation and ledger migration

**Files:**
- Create: `src/modules/gym/location-validation.ts`
- Modify: `src/modules/gym/gym-service.ts`
- Modify: `src/db/migrations.ts`
- Modify: `tests/m2-modules.test.ts`
- Modify: `tests/migration-ledger.test.ts`

**Interfaces:**
- Produces `validateLatitude`, `validateLongitude`, and `validateCoordinatePair`.
- Gym create/update reject partial coordinate pairs and out-of-range numbers.
- Ledger version 5 additively ensures `gyms.latitude`, `gyms.longitude`, and `gyms.external_place_id`.

- [ ] **Step 1: Add failing Gym validation and version-five ledger tests**
- [ ] **Step 2: Run tests and observe failures**
- [ ] **Step 3: Implement validation and additive migration**
- [ ] **Step 4: Re-run focused tests**

### Task 2: Location public module

**Files:**
- Create: `src/modules/location/types.ts`
- Create: `src/modules/location/ports.ts`
- Create: `src/modules/location/distance.ts`
- Create: `src/modules/location/location-service.ts`
- Create: `src/modules/location/index.ts`
- Create: `tests/location-module.test.ts`

**Interfaces:**
- Produces `createLocationService({ locationProvider, gymService })` with `getCurrentLocation`, `calculateDistance`, `getDistanceToGym`, and `listNearbyGyms`.
- Uses Haversine meters, structured unavailable statuses, excludes closed/missing-coordinate gyms, sorts by distance then Gym ID, and supports limit/max distance.

- [ ] **Step 1: Add failing Location service tests**
- [ ] **Step 2: Run tests and observe failures**
- [ ] **Step 3: Implement types, unavailable provider, distance, and orchestration**
- [ ] **Step 4: Re-run focused tests**

### Task 3: Minimal development validation page

**Files:**
- Create: `app/(tabs)/location.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Create or Modify: `tests/web-import-safety.test.ts`

**Interfaces:**
- Location development page uses only Gym and Location public APIs.
- Displays provider status, manual origin, known Gym coordinates, distance, and nearby result list.

- [ ] **Step 1: Add failing page-boundary test**
- [ ] **Step 2: Run tests and observe failure**
- [ ] **Step 3: Implement minimal validation page and tab entry**
- [ ] **Step 4: Re-run focused tests**

### Task 4: Full verification and checkpoint

- [ ] **Step 1: Scope/diff review**
- [ ] **Step 2: Run `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, and `npx expo export --platform web`**
- [ ] **Step 3: Commit `feat: add location core and gym geography`**
