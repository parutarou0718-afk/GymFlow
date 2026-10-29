# GymFlow Release Readiness Audit

Baseline audited: `b0839e70db6eb6c9d0497f1c05393ce4a63febf7` (`test: add M21 end-to-end acceptance coverage`)

## Executive Summary

**Current readiness level: B — Ready for developer/internal testing only.** GymFlow's local domain and M21 Gym-aware training journey are substantially verified, but it is not safe to hand to real Private Beta users yet. The primary blockers are not another training feature: they are production identity/authorization, production persistence and recovery, and real Gym inventory operations.

Top five blockers:

1. Every product journey is bound to `DEFAULT_LOCAL_USER_ID`; Supabase sign-in is not connected to domain ownership or current-user resolution.
2. There is no server-side authorization/RLS or production ownership boundary for cloud data.
3. Sync is optional, manually configured on each native device, has no conflict model, and Web is deliberately memory-only.
4. Gym and Inventory data are seeded/demo/local records with no supported operator ingestion, editing, provenance, or freshness workflow.
5. Private Beta distribution, native-device QA, observability, privacy documentation, and account-deletion support have no repository evidence.

**Recommended next milestone: M22 — Private Beta Foundation: identity, server-authorized persistence, recovery, and curated Gym-data operations.** It should explicitly feature-gate Social until its cloud authorization path exists.

## P0 — Blocks Private Beta

### P0-1

- **Area:** Authentication, identity, and authorization
- **Finding:** Stable local domain identities exist, but production identity does not. `UserService.getCurrentUser()` always loads/creates `DEFAULT_LOCAL_USER_ID`; Home, Gym Context, Program Detail, Replacement Review, Workout Visit recording, and user-Gym UI invoke that ID directly. Native Supabase sign-in in `src/lib/supabase.ts` is a separate settings flow and does not switch the domain current user or bind records to `auth.uid()`.
- **Evidence:** `src/modules/user/seed.ts`, `src/modules/user/user-service.ts`, `app/(tabs)/index.tsx`, `app/program-detail.tsx`, `app/replacement-review.tsx`, and `src/modules/workout/workout-service.ts`.
- **User impact:** A real user cannot create/use a product account with isolated data, switch accounts, or recover the correct identity. Enabling multi-user/social/cloud use would make owner fields insufficient because the actual actor remains the local default user.
- **Required outcome:** Production authentication must resolve the domain current user; all user-scoped actions must use that identity; logout/account switching must be safe.
- **Suggested owner/module:** Identity boundary, `src/modules/user`, app session/bootstrap.
- **Estimated implementation shape:** L

### P0-2

- **Area:** Data isolation and cloud authorization
- **Finding:** Local service checks implement useful ownership/visibility logic for Social, but no cloud schema, RLS policy, authenticated API boundary, or server-side authorization is present. The native sync client upserts snapshots to `sessions`/`templates` by record ID without owner/user scope; local persistence is not a multi-user security boundary.
- **Evidence:** `src/lib/supabase.ts`, absence of Supabase migrations/policies, `src/modules/social/social-service.ts`, `src/modules/sharing/sharing-service.ts`.
- **User impact:** Once real accounts or shared cloud data are enabled, knowing an ID could expose or overwrite another user's records unless a server-enforced boundary is introduced.
- **Required outcome:** Authenticated backend tables/API plus RLS/server authorization for profiles, workouts, programs, user-Gym relations, and social/share paths; ownership must be enforced independently of client checks.
- **Suggested owner/module:** Cloud data/authorization boundary.
- **Estimated implementation shape:** XL

### P0-3

- **Area:** Production persistence, backup, and recovery
- **Finding:** Native SQLite persists on-device and atomic Workout completion is sound, but cloud sync is not a production system: it is manually configured through Settings, Web is explicitly in-memory, no automatic retry/backoff/conflict handling/account restore exists, and reinstall/device-loss recovery is absent.
- **Evidence:** `src/db/storage-bootstrap.native.ts`, `src/db/storage-bootstrap.web.ts`, `src/lib/supabase.ts`, `src/lib/supabase.web.ts`.
- **User impact:** Workout/Program/Gym relationship data can be irrecoverably lost after device loss, reinstall, corruption, or an unconfigured sync device. Cross-device use is not supported.
- **Required outcome:** Define the Private Beta storage promise and implement one durable, authenticated persistence/recovery path. At minimum, users must not be presented with a cloud/account experience that does not restore their domain data.
- **Suggested owner/module:** Storage/cloud sync and app bootstrap.
- **Estimated implementation shape:** XL

### P0-4

- **Area:** Gym inventory data operations
- **Finding:** Gym-aware matching depends on Gym Inventory, but the repository supplies demo/seed records and local CRUD screens only. There is no curated real-Gym dataset, bulk import, operator workflow, source/verification metadata, correction path outside an app build, or freshness review process.
- **Evidence:** `src/db/web-store.ts`, `src/modules/gym/*`, `src/modules/gym-inventory/*`, seed files under `src/modules/*/seed.ts`.
- **User impact:** A Beta user cannot reliably select a represented real Gym with trustworthy equipment. Incorrect or stale inventory produces materially wrong matching/adaptation guidance.
- **Required outcome:** Curate a deliberately limited initial Gym cohort, establish a validated ingestion/edit workflow (CSV/JSON/spreadsheet plus validation/import is sufficient), and retain source/last-verified metadata with an operator correction process.
- **Suggested owner/module:** Data operations plus Gym/Inventory persistence.
- **Estimated implementation shape:** L

## P1 — Strongly Recommended

### P1-1

- **Area:** Native release and distribution readiness
- **Finding:** `app.json` has bundle/package identifiers and an Expo project ID, but there is no `eas.json`, no repository evidence of iOS/Android production builds, TestFlight/Internal Testing delivery, device matrix QA, store metadata, or environment separation.
- **Evidence:** `app.json`; no `eas.json`; validation evidence is Web-only.
- **User impact:** High support risk from native-only SQLite, SecureStore, routing, lifecycle, and build-signing differences.
- **Required outcome:** Create and exercise controlled native build profiles; validate install/upgrade/background/restart on representative iOS and Android devices before distribution.
- **Suggested owner/module:** Release engineering.
- **Estimated implementation shape:** M

### P1-2

- **Area:** Error recovery and observability
- **Finding:** There is no error boundary, crash reporter, remote structured logging, release/version diagnostics, or support-facing recovery surface. Some UI code displays raw service errors; completion/replacement errors have uneven retry/escape UX.
- **Evidence:** `app/_layout.tsx` only logs bootstrap failure with `console.error`; error handling in `app/program-detail.tsx`, `app/replacement-review.tsx`, and `src/components/session/ActiveWorkout.tsx`.
- **User impact:** The team cannot reliably diagnose “Workout disappeared,” completion failures, wrong-Gym reports, or crashes from 20 remote users.
- **Required outcome:** Minimum viable crash reporting, release metadata, and critical-workflow error logging; make failed completion/replacement states actionable and retryable.
- **Suggested owner/module:** App shell, Workout UI, diagnostics.
- **Estimated implementation shape:** M

### P1-3

- **Area:** Privacy, account deletion, and support obligations
- **Finding:** Privacy defaults and Social visibility semantics exist, but no privacy policy, terms, support URL, account deletion, or full data deletion/export flow is present. Programs and posts can be deleted; Workouts have discard-before-completion only; the default current user cannot be archived.
- **Evidence:** `app/(tabs)/profile.tsx`, `src/modules/user/user-service.ts`, `src/modules/program/program-service.ts`, `src/modules/social/social-service.ts`, `app.json`.
- **User impact:** Real-user data handling and deletion requests cannot be responsibly supported, especially once Auth/cloud/social ship.
- **Required outcome:** Define privacy/support documents and implement account/data deletion policy and workflow alongside cloud identity. Feature-gate Social until then.
- **Suggested owner/module:** Product/legal plus identity/cloud.
- **Estimated implementation shape:** L

### P1-4

- **Area:** Migration/recovery hardening
- **Finding:** SQLite has ordered additive migrations to schema version 10 and automated ledger tests. There is no rollback, backup-before-migrate, failed-migration recovery UX, or evidence of native upgrade testing against real persisted databases.
- **Evidence:** `src/db/migrations.ts`, `tests/migration-ledger.test.ts`, `src/db/database.ts`.
- **User impact:** A failed production upgrade can strand local data with limited diagnosis or recovery.
- **Required outcome:** Native upgrade test fixtures, migration failure/retry policy, and a recovery/support procedure before Beta distribution.
- **Suggested owner/module:** SQLite migration/storage.
- **Estimated implementation shape:** M

### P1-5

- **Area:** Safety/data coverage
- **Finding:** Safety semantics are conservative—unknown capability is presented as unknown, non-executable candidates are filtered, replacement requires explicit choice, and loads reset. However requirement/capability/substitution coverage is narrow and seeded; there is no review/provenance workflow for mapping correctness.
- **Evidence:** `src/modules/exercise-equipment/seed.ts`, `src/modules/exercise-substitution/seed.ts`, `src/lib/replacement-review-presentation.ts`, M21 acceptance tests.
- **User impact:** Incomplete or incorrect mappings can still rank an unsuitable movement or misrepresent a Gym's capability.
- **Required outcome:** Limit Beta to a curated exercise/Gym scope, review safety-sensitive mappings, and define a fast correction/rollback process.
- **Suggested owner/module:** Training data operations.
- **Estimated implementation shape:** M

### P1-6

- **Area:** Dependency/security review
- **Finding:** `npm audit --omit=dev` reports 33 vulnerabilities (13 high, 20 moderate), including dependency chains through Expo/Metro and React Navigation. `npm outdated` reports newer packages; no automatic upgrade is recommended by this audit.
- **Evidence:** audit command output on the accepted baseline.
- **User impact:** The exploitability of several findings in the mobile production bundle needs triage; leaving them unreviewed is not appropriate for external distribution.
- **Required outcome:** Triage each production-reachable advisory with Expo compatibility; apply a tested compatible remediation plan rather than `npm audit fix --force`.
- **Suggested owner/module:** Release/security maintenance.
- **Estimated implementation shape:** M

### P1-7

- **Area:** Onboarding and accessibility
- **Finding:** Empty states explain Quick Workout and Gym selection, but there is no first-run flow, Gym-data explanation, adaptation primer, accessibility labels/roles, or systematic text-scaling/touch-target evidence.
- **Evidence:** `app/(tabs)/index.tsx`; repository search finds no `accessibilityLabel`/`accessibilityRole` usage.
- **User impact:** Users can likely start a Quick Workout, but Gym-aware value and adaptation decisions will create high support friction.
- **Required outcome:** A minimal first-run/empty-state journey and basic accessibility pass for primary Workout, Gym, modal, and navigation controls.
- **Suggested owner/module:** Product UI.
- **Estimated implementation shape:** M

## P2 — Deferred

- **P2-1 — Performance:** Lists and social/history name resolution contain likely N+1 patterns and no pagination evidence. Acceptable for a tightly capped cohort; profile after real data sizes are known. **Owner:** UI/data access. **Shape:** M.
- **P2-2 — Localization:** Strings are hardcoded English; no i18n infrastructure exists. Safe to defer if the initial cohort is English-speaking. **Owner:** Product platform. **Shape:** L.
- **P2-3 — Advanced sync:** There is a queue and status field, but no conflict UX, scheduling, or operator dashboard. Required only after the durable identity/persistence foundation exists. **Owner:** Cloud sync. **Shape:** L.
- **P2-4 — Store-public launch assets:** Icons exist and IDs are set, but screenshots, store listings, public URLs, and declarations are absent. Necessary for public release, not before a controlled internal distribution. **Owner:** Release/product. **Shape:** M.

## Existing Strengths

- M21 end-to-end behavioral acceptance validates Gym selection, Program matching, explicit adaptation, in-Workout replacement, completion, history, Visit semantics, no-Gym Quick Workout, and duplicate exercise identity (`tests/m21-e2e-acceptance.test.ts`).
- Workout completion is atomic: session completion, snapshot, and completion event are committed together, with regression coverage for failure stages (`src/modules/workout/workout-service.ts`, `tests/workout-module.test.ts`).
- WorkoutSession `gymId` remains authoritative after Current Gym changes; partial replacement preserves completed work, resets replacement loads, records provenance, and does not mutate Gym Inventory.
- Program adaptation creates an independent Program and leaves the original immutable; replacement decisions are explicit and stale guards are tested.
- Migrations are ordered/additive and covered by ledger tests. Native SQLite uses WAL and foreign keys.
- Social service has local ownership/visibility/revocation checks, and copied Programs remain independent within the local domain model.

## Release Gate Checklist

| Gate | Status | Evidence / required next step |
| --- | --- | --- |
| Auth | FAIL | Supabase sign-in is disconnected from domain identity; local default user remains authoritative. |
| User isolation | FAIL | No server-enforced authorization/RLS or authenticated cloud ownership boundary. |
| Production persistence | FAIL | SQLite is local; sync is manual/partial and Web is memory-only. |
| Migrations | PARTIAL | Ordered schema-v10 ledger/tests exist; no native upgrade/recovery/rollback procedure. |
| Gym data | FAIL | No curated Beta Gym inventory or operator workflow. |
| Exercise/Equipment data | PARTIAL | Seeded catalog and conservative matching exist; coverage/provenance governance is insufficient. |
| Onboarding | PARTIAL | Useful empty states and Quick Workout exist; no first-run Gym-aware guidance. |
| Critical error recovery | PARTIAL | Domain atomicity is strong; UI recovery and remote diagnosis are incomplete. |
| Native QA | FAIL | Web export is verified; no iOS/Android device evidence. |
| Production build config | PARTIAL | Identifiers/project ID exist; no EAS profiles or environment separation evidence. |
| Crash reporting | FAIL | No error boundary or remote crash/critical-error reporting. |
| Privacy | FAIL | Local defaults exist; policy/support/store privacy documentation absent. |
| Account deletion | FAIL | Individual Program/Post/relation operations exist; no account/full-data deletion. |
| Dependency/security review | PARTIAL | Audit run found 33 advisories; remediation/triage is outstanding. |
| TestFlight / internal Android distribution | FAIL | No build/distribution configuration or native delivery evidence. |

## Recommended Execution Order

1. **Release Track 1 — Identity and production data boundary:** Auth-to-domain identity binding, server authorization/RLS, durable owner-scoped persistence, account switching/recovery, and Social feature-gating.
2. **Release Track 2 — Curated Gym and training knowledge operations:** limited real-Gym cohort, inventory import/validation, source/freshness metadata, mapping review and correction workflow.
3. **Release Track 3 — Native resilience:** native build profiles, real-device install/upgrade/restart/background QA, migration recovery policy, and core-flow error recovery.
4. **Release Track 4 — Beta safety and support:** crash/error diagnostics, dependency vulnerability triage, privacy/support/deletion commitments, and minimal onboarding/accessibility.
5. **Release Track 5 — Private Beta packaging:** TestFlight/Android internal distribution, release metadata, operational playbook, and a small monitored cohort.

## Audit Notes

- **Cloud/sync:** No production backend is demonstrated. Device loss, reinstall, cross-device use, and account recovery are unsupported today.
- **Native persistence:** Native SQLite should survive ordinary app restart; Web Store is explicitly in-memory. Native restart/upgrade behavior has not been proven on hardware.
- **Navigation/lifecycle:** Active Workout disables modal gesture-back and pauses on AppState backgrounding, but route reload/duplicate-tap/native lifecycle coverage is incomplete outside the domain E2E suite.
- **Social boundary:** Local visibility/revocation tests are sound, but Social must not be exposed to real users until P0 identity/authorization is delivered.
- **Data operations:** Current local CRUD is not an operator system. A validated spreadsheet/CSV/JSON-to-persistence workflow is sufficient for Beta; an admin UI is not required.
