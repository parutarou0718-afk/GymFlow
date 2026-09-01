# M22.3 Native Beta Build Design

## Scope

M22.3 establishes native build configuration and records reproducible device acceptance evidence. It does not add M22.4 monitoring, privacy, support, cloud-sync, or UI work.

## Current architecture

Native `bootstrapStorage()` opens `gymflow.db`, initializes SQLite, and applies the ordered migration ledger through schema v12. `StoreProvider` supplies the native store; the current-user provider resolves the stored Supabase session to a Domain User after the store is available. The Home screen owner-scopes the active-workout lookup and exposes Resume, which routes the persisted session ID to the active-workout screen. Workout state, including its immutable `gymId` and set completion, is loaded through `WorkoutService`.

Supabase currently reads endpoint configuration only from SecureStore. M22.3 will add a build-time public configuration fallback for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. SecureStore remains an explicit operator override. The anonymous key is intentionally a publishable client value, never a service-role secret.

## Chosen approach

Use one Expo application identity and three small EAS profiles. The profiles define only build intent and a public environment label; deployment-specific Supabase URL and anonymous-key values are supplied through EAS environment configuration, not committed. This permits development and preview builds to point at an explicit Beta Supabase project while allowing production to be configured separately.

Native acceptance is captured as a matrix with only observed outcomes marked PASS. The repository will provide a deterministic manual procedure, but unavailable Apple/Google credentials or physical devices remain `BLOCKED-environment`, not inferred success. A local CLI/config check is evidence of configuration only.

## Boundaries and invariants

- Auth provider objects remain at the infrastructure/current-user boundary.
- One shared SQLite database can contain records for multiple users; all normal private reads remain owner-scoped.
- An active Workout remains owned by its persisted `ownerUserId` and keeps its persisted `gymId`; Current Gym does not replace it.
- No generated `ios/` or `android/` directory is committed.
- No credentials or service-role keys are stored in `app.json`, `eas.json`, documentation examples, or source.

## Validation

Run the complete TypeScript/Web suite and Expo configuration checks. Attempt Android and iOS EAS preview builds only after configuration is committed; report credential/account failures precisely. Device exercises are carried out on development or preview builds, never Expo Go.
