# GymFlow Core Architecture Audit — M1–M11

**Audit baseline:** `af7cc82 feat: add user gym relationship module`
**Scope:** Static architecture and repository audit only. No product behavior was changed.

## Executive assessment

The core domain boundary is ready for the next planning decision, but it is **not yet a fully hardened platform core**. The module/public-API model is now established and the M1–M11 domains have clear primary owners. The main follow-up work is architectural consolidation: migration governance, transactional Workout writes, and removal of the remaining UI Store bypass.

There are no P0 blockers discovered in this audit. The three P1 items should be explicitly scheduled before Auth/Cloud Sync or multi-device data is introduced.

## 1. Module ownership and public API

| Module | Owns | Public entry |
|---|---|---|
| Workout | sessions, lifecycle, history, Workout domain events/snapshots | `createWorkoutService` |
| Program | planned training data; compatibility-backed by legacy templates | `createProgramService`, `createProgramInputFromCompletedWorkout` |
| Gym | gym identity and lifecycle | `createGymService` |
| Equipment | equipment master | `createEquipmentService` |
| Gym Inventory | a gym's equipment inventory/capabilities | `createInventoryService` |
| Exercise | canonical exercise master | `createExerciseService` |
| Movement Family | movement taxonomy family | `createMovementFamilyService` |
| Exercise Equipment | family assignments and OR/AND equipment requirements | `createExerciseEquipmentService` |
| Exercise Substitution | curated directional substitutions | `createExerciseSubstitutionService` |
| Candidate Resolution | deterministic candidate discovery | `createCandidateResolutionService` |
| Matching | gym-aware exercise executability | `createMatchingService` |
| Program Matching | read-only aggregation of Program + Matching | `createProgramMatchingService` |
| Program Adaptation | copies a match result into a new Program | `createProgramAdaptationService` |
| User | stable GymFlow user/profile/current-user resolution | `createUserService` |
| User–Gym | Home/Favorite/Visit/Recent/Membership relationship | `createUserGymService` |

The root `src/types/index.ts` remains the legacy persistence/type compatibility surface for Workout/Template/session data. It is not a second public domain module.

## 2. SQLite schema and table ownership

| Table | Owner | Important fields / relations |
|---|---|---|
| `meta` | storage infrastructure | `schema_version` metadata |
| `users` | User | profile JSON fields; old `email/name/avatar` columns may remain on migrated installs |
| `user_gyms` | User–Gym | unique `(user_id,gym_id)`; FK → `users`, `gyms`; Home/Favorite/Visit/Membership fields |
| `templates` | Program compatibility | legacy physical name; full Program/WorkoutTemplate `snapshot` JSON |
| `sessions` | Workout | FK `template_id → templates`; status/time/volume/snapshot |
| `session_exercises` | Workout | FK → `sessions` cascade |
| `completed_sets` | Workout | FK → `session_exercises` cascade |
| `sync_queue` | Workout sync infrastructure | FK → `sessions` cascade |
| `domain_events` | Workout event infrastructure | event payload JSON; no FK by design |
| `gyms` | Gym | identity/location/status |
| `equipment` | Equipment | aliases JSON/archive flag |
| `gym_equipment` | Gym Inventory | FK → `gyms`, `equipment`; unique `(gym_id,equipment_id)` |
| `exercises` | Exercise | stable IDs, aliases/muscles JSON, active/archive status |
| `movement_families` | Movement Family | taxonomy metadata |
| `exercise_movement_families` | Exercise Equipment | FK → exercise/family; unique assignment |
| `exercise_requirement_groups` | Exercise Equipment | FK → exercise; OR group ordering |
| `exercise_equipment_requirements` | Exercise Equipment | FK → group/equipment; unique group/equipment |
| `exercise_substitutions` | Exercise Substitution | FK → source/target exercise; unique directional pair |

Foreign-key and index coverage is appropriate for the relationships currently modeled. `user_gyms` has user, gym, and recent-visit indexes; Home uniqueness is enforced by the module's transaction rather than a partial unique index.

## 3. Dependency matrix

| Consumer | Allowed dependencies observed | Notes |
|---|---|---|
| UI validation pages | their module public API plus required sibling public APIs | Gym, Profile, User–Gym, Matching, Program Matching comply |
| Workout hook/UI | Workout public API | `useWorkoutEngine` correctly coordinates rather than reimplements lifecycle |
| Program Matching | Program API + Matching API | read-only aggregation; no Program mutation |
| Program Adaptation | Program API + Gym API | copies output; no original Program mutation |
| User–Gym | User API + Gym API + own Store port | validates entities through public services |
| Matching | Gym, Inventory, Exercise, Taxonomy, Substitution Store ports | internal domain composition, not UI bypass |
| Candidate Resolution | Exercise, Taxonomy, Substitution Store ports | internal domain composition |

No module imports `src/db/database.ts` directly. SQLite is accessed from the database adapter/factory, except the legacy Supabase sync skeleton described below.

## 4. Store / SQLite boundary scan

**Compliant:** Plans, template editing, history save-as-Program, Gym, Profile, User–Gym, Matching and Program Matching pages instantiate and use module public APIs. The static tests protect several of these boundaries.

**P1 — Home UI bypass:** `app/(tabs)/index.tsx` directly destructures `sessions` and `templates` from `useStores()` to load active state, totals, and recent templates. This is the remaining clear UI → Store boundary violation. It should eventually use Workout and Program read APIs.

**P2 — legacy sync bypass:** `src/lib/supabase.ts` imports database functions directly for sync and template reads. This is outside the new module boundary model and should be replaced by explicit sync-facing ports when Cloud Sync is revisited.

## 5. Legacy and compatibility debt

| Item | Current containment | Risk / recommended disposition |
|---|---|---|
| `WorkoutTemplate` / `templates` | Program is intentionally an alias over the existing type/table and IDs | P1 compatibility debt. Keep until a versioned Program migration is designed; do not rename opportunistically. Workout still reads templates directly, so Program extraction is not yet universal. |
| Root `UserProfile(email,name,avatar)` | New User module owns canonical profile; legacy root type is not consumed by new User code | P2. Deprecate/document it and remove only after confirming no native persisted rows or external consumers need it. |
| Legacy `users` table shape | additive User migration adds canonical profile columns and preserves old columns | P1 migration debt. Safe for now, but a future schema version must make the canonical column set explicit. |
| Supabase/Auth skeleton | isolated in `src/lib/supabase*` and Settings; Auth UUID is not a domain primary key | P1 before Auth/Cloud. It currently has no GymFlow user-identity mapping or public module boundary. |
| Root Exercise type vs Exercise Master | Workout snapshots still carry legacy Exercise; M3 master supplies canonical searchable data | P2. Clarify adapter/enrichment ownership before changing exercise persistence. |

## 6. Migration and persistence risks

1. **P1 — `SCHEMA_VERSION` remains `1`.** Schema changes rely on `CREATE TABLE IF NOT EXISTS`, seed inserts, and ad-hoc `PRAGMA table_info` + `ALTER TABLE`. Existing-user migration is additive, but metadata does not represent actual migration history. Introduce ordered, idempotent migrations before Cloud Sync/Auth or any destructive change.
2. **P1 — Workout completion is not one SQLite transaction.** Session status, snapshot/sync queue, and domain event are individually persisted in service order. Events are emitted after session persistence, which avoids false-positive completion events, but a mid-sequence failure can leave partial state. Add a dedicated atomic Workout completion port before durable sync/event consumers are introduced.
3. **P2 — central database adapter is a growing monolith.** `src/db/database.ts` owns all schema and adapters. This is acceptable at current size, but per-module persistence registration/migrations should be planned before the next several domains.
4. **P2 — JSON snapshots are intentionally flexible but unversioned by table.** Program/templates and workout snapshots should gain explicit schema-version/read migration rules before long-lived cloud data.

## 7. Native / Web semantic parity

| Area | Status |
|---|---|
| Store selection | Native factory uses SQLite; Web factory uses memory Store; Web bootstrap avoids native DB import. |
| Workout / Program / Gym / Exercise domains | Shared service contracts and Web tests cover core behavior. |
| User | same Store port and default-user semantics; Web tests cover bootstrap/update/archive. |
| User–Gym | same port semantics; SQLite uses exclusive transaction for Home replacement; Web implements equivalent replacement/cleanup. |
| Content seeding | Intentionally different: Web includes demo templates/history/equipment while native seeds master/taxonomy data. This is a preview-data difference, not intended semantic divergence. |

**Residual P2:** there is no automated native SQLite integration suite in the Node test run; parity is asserted through shared service behavior, compilation, and separate Store implementations. Add device/emulator migration tests before claiming production-grade persistence parity.

## 8. Development-validation UI inventory

These are intentionally non-final administration/verification pages: `Gyms`, `Exercises`, `Taxonomy`, `Matching`, `Program Matching`, `Profile`, and `User Gyms`. They are visible as tabs today, so they should be gated, relocated, or redesigned before a production user release.

`Settings` contains a pre-existing Supabase/Auth configuration and sign-in skeleton. It is not the M10 User profile UI and should not be treated as the future account experience.

## 9. Technical-debt backlog

### P0

None found by this audit.

### P1

1. Replace Home page direct `sessions/templates` Store access with Workout/Program public read APIs.
2. Add a real ordered SQLite migration ledger and bump/version all existing additive migrations.
3. Introduce atomic Workout completion persistence for session, snapshot/outbox, and domain event.
4. Define Auth/Cloud identity mapping (`external auth identity → GymFlow userId`) and move Supabase sync behind module ports before enabling it.
5. Write a future Program storage migration plan; retain `templates`/`WorkoutTemplate` unchanged until then.

### P2

1. Deprecate or delete the root legacy `UserProfile` after a persisted-data and external-consumer check.
2. Split database schema/adapters into module-oriented files before the next large cluster of domains.
3. Add native SQLite migration/integration coverage.
4. Establish snapshot read-versioning rules.
5. Move development validation pages out of the production tab surface when final navigation work begins.

## 10. Readiness decision

**Suitable now:** planning and implementing the next bounded local domain, provided it follows the current module/public API pattern.

**Not yet suitable without P1 work:** enabling durable Cloud Sync/Auth, treating Supabase settings as production identity, or relying on cross-device event/outbox correctness.

**Recommended sequencing:** either perform P1 #2 and #3 as a short persistence-hardening phase before Auth/Cloud, or choose another fully local product domain (for example Location or Social data modeling) while explicitly deferring Cloud. Do not start Cloud/Auth implementation on the current migration/event architecture without resolving those P1 items first.
