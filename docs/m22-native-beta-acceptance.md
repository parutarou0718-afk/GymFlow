# M22.3 Native Beta Acceptance

## Scope and evidence rules

This document is the M22.3 native-device acceptance procedure. It distinguishes configuration from a built binary, an installed binary, and an observed device journey. Expo Go is not valid evidence because GymFlow relies on `expo-sqlite`, `expo-secure-store`, and `expo-dev-client`.

Allowed matrix statuses are `PASS`, `FAIL-product defect`, `FAIL-config`, `BLOCKED-environment`, and `N/A`. Only a directly observed result is `PASS`.

## Native architecture verified from source

- Native storage starts in `app/_layout.tsx` through `bootstrapStorage()`. `src/db/storage-bootstrap.native.ts` opens the singleton SQLite database named `gymflow.db` and then processes the existing sync queue.
- `getDatabase()` initializes tables, enables WAL/foreign keys, and applies the ordered SQLite migration ledger. The current schema version is **v12**.
- `StoreProvider` supplies the native SQLite-backed store. `CurrentUserProvider` gets the persisted Supabase session through SecureStore and resolves it to a stable Domain User. A missing native session enters the logged-out gate; it never falls back to `local_default_user`.
- Home obtains active Workouts through `getActiveWorkoutsForOwner(user.id)` and presents Resume using the persisted session ID. Active-workout loading is owner-scoped. Persisted session `gymId` remains the Workout Gym authority and is never replaced by Current Gym.
- The active-workout hook pauses an active session once on `AppState` transition to inactive/background. Persisted paused status and completed sets are reloaded from `WorkoutService`.

## Build configuration

`eas.json` defines `development`, `preview`, and `production` without secrets.

| Profile | Distribution | Intent |
| --- | --- | --- |
| `development` | internal + dev client | Developer diagnosis on a physical device |
| `preview` | internal | Private Beta installation |
| `production` | store-ready placeholder | Reserved for a later release path |

App identity remains unchanged:

- Scheme: `gymflow`
- iOS bundle ID: `com.gymflow.app`
- Android package: `com.gymflow.app`
- EAS project ID: `7a30310f-fb4c-41e1-a670-4d6ad3ba7fd4`

### Required EAS environment values

Set these **public client values** separately in the EAS `development`, `preview`, and `production` environments before building:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

The app uses complete SecureStore configuration first; otherwise it reads these two build values. Do not configure a Supabase service-role key in EAS or the app. The preview build profile currently has no EAS values for either required variable, so it cannot provide a preconfigured Auth experience until an operator adds them.

## Current build evidence — 2026-09-01

| Platform | Configured | Built | Installed | Manually verified | Evidence |
| --- | --- | --- | --- | --- | --- |
| Android | PASS | Build requested / queued | BLOCKED-environment | BLOCKED-environment | Preview build `18053a12-d03c-4be9-ae39-63fc418502d4` was uploaded from commit `09279a3884aa7a5e4218681af8df7246a8ddf832`; no artifact was available when this document was written. |
| iOS | PASS | FAIL-config | BLOCKED-environment | BLOCKED-environment | EAS reports no credential suitable for internal distribution in non-interactive mode. |

Android build logs: <https://expo.dev/accounts/tmactman/projects/gymflow/builds/18053a12-d03c-4be9-ae39-63fc418502d4>

## Device acceptance matrix

| Scenario | iOS | Android | Evidence / required observation |
| --- | --- | --- | --- |
| Fresh install | BLOCKED-environment | BLOCKED-environment | Install preview/development binary; database initializes; login gate appears; no demo data is shown. |
| Auth restore | BLOCKED-environment | BLOCKED-environment | Sign in User A, kill/reopen, and confirm the same Supabase account resolves to the same Domain User ID. |
| Current Gym restore | BLOCKED-environment | BLOCKED-environment | Set Gym A, kill/reopen, and confirm Gym A is the Current Gym. |
| Program restore | BLOCKED-environment | BLOCKED-environment | Create Program P as A, kill/reopen, and confirm it remains in A's Program list. |
| Active Workout background | BLOCKED-environment | BLOCKED-environment | Start W, complete sets, background/foreground; exactly one pause is recorded and the same W/sets return. |
| Active Workout process death | BLOCKED-environment | BLOCKED-environment | Force-close after set completion; relaunch, use Home Resume, and confirm W owner, gym, and pending/completed sets. |
| Workout Gym authority | BLOCKED-environment | BLOCKED-environment | W starts at Gym A; change Current Gym to B where allowed; restart and confirm W still uses Gym A. |
| Completion/History restore | BLOCKED-environment | BLOCKED-environment | Finish W, kill/reopen, and confirm persisted completion facts and History entry. |
| Visit persistence | BLOCKED-environment | BLOCKED-environment | Confirm one Visit at W.gymId after completion; refresh/relaunch must not create another. |
| Account switching | BLOCKED-environment | BLOCKED-environment | A logs out to the auth gate; B logs in and cannot read A's private Programs, Workouts, or Gym relations; switch back to A and confirm A's data. |
| Migration upgrade | BLOCKED-environment | BLOCKED-environment | Update a representative pre-v12 installed database; data survives and schema reaches v12. Migration-ledger unit tests alone are not this evidence. |
| Auth redirect/deep link | N/A | N/A | Current product Auth is email/password; no browser OAuth callback is implemented. Scheme remains reserved for future redirects. |

## Operator procedure

1. Configure the two public Supabase variables for the selected EAS environment. Use a dedicated Private Beta Supabase project for preview; production values must be a separate environment.
2. Build and install a device-representative binary:

   ```bash
   npx eas-cli build --profile preview --platform android
   npx eas-cli build --profile preview --platform ios
   ```

3. On each physical device, perform Fresh install, sign in User A, create/select Gym A, create Program P, start W, complete one or more sets, background/foreground, and force-close/relaunch. Record the actual outcomes in the matrix.
4. Set a different Current Gym only after W is persisted; reopen W through Home Resume and verify the session still displays Gym A.
5. Finish W; force-close/relaunch; check the History entry, completion facts, and exactly one Gym A Visit.
6. Log out. Confirm the logged-out gate. Sign in User B and verify B cannot access A's private user-scoped records. Sign back into A and verify A's records reappear.
7. For migration evidence, begin with a genuine pre-v12 build/database (or a representative pre-v12 SQLite fixture installed through a debug-capable build), update to the current preview binary, then repeat Current Gym, Program, active Workout, History, and Visit checks. Record the before/after schema version and retained records.

## Known blockers and next evidence needed

- Android: wait for the queued EAS job to produce an installable artifact, then complete the Android matrix on a physical device.
- iOS: configure/select a valid Apple internal-distribution credential in an interactive EAS session, build, install, and complete the iOS matrix.
- Both platforms: set preview EAS `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, then use two controlled test accounts for identity and owner-isolation checks.

Until this evidence exists, M22.3 is **configuration implemented; native acceptance blocked**. It is not a native-device PASS.
