# GymFlow Web Development Preview Design

## Goal

Make the existing Expo SDK 54 GymFlow application runnable in a desktop browser for UI and workflow development. The web preview must exercise the existing Home, Plans, History, Settings, and template-to-workout flows without changing their public storage interface or native persistence behavior.

## Scope

- Install Expo-compatible web runtime dependencies.
- Provide a `WebGymFlowStore` implementing the existing `GymFlowStore` interface.
- Use a small deterministic in-memory seed dataset on web startup.
- Keep web-side template CRUD changes visible during the current page lifetime.
- Select the store implementation once in the store provider based on `Platform.OS`.
- Keep Android and iOS on the existing SQLite store.
- Initialize Git and add a suitable Expo/React Native `.gitignore` if absent or incomplete.

## Out of scope

- Web persistence (`localStorage`, IndexedDB, browser SQLite, or cloud storage).
- Production web support, authentication, Supabase sync, RLS, and data migration.
- Quick Workout and pause/resume fixes.
- New product features or visual redesigns.

## Architecture

`StoreProvider` remains the only platform-selection boundary. On Android and iOS it returns the existing singleton created by `createStore()` from the SQLite layer. On web it returns a module-scoped `WebGymFlowStore`.

The web store keeps arrays of workout templates and sessions in memory. It is initialized from seed data when the module loads, so a browser refresh restores the initial demonstration state. All methods required by `GymFlowStore` return promises and retain the same observable behavior needed by current screens. The web store does not import or invoke Expo SQLite.

Existing page and component code continues to call `useStores()` and must not gain platform branches. Native database and sync code remain unchanged except where an import must be made platform-safe for the root layout.

## Seed data

The seed dataset contains a small set of named templates with embedded exercise metadata, at least one completed session for the History screen, and sufficient data for Home statistics. There is no active session by default. IDs are stable strings within a page lifetime.

## Web compatibility

Install versions selected by `npx expo install react-dom react-native-web @expo/metro-runtime`. Verify that importing the root application on web does not evaluate an unsupported SQLite dependency. Platform-specific code or lazy loading may be used only at the storage boundary.

## Acceptance criteria

1. `npx expo start --web` starts and renders the app.
2. Home, Plans, History, Settings, and tab navigation render without a runtime error.
3. Plans can be created, edited, copied, and deleted in the current browser session.
4. A seeded plan can start a workout, and the workout UI supports set edits and completion toggles.
5. History displays seeded completed data.
6. Browser refresh resets web state to seed data.
7. Android/iOS retain the existing SQLite store path.
8. `npx tsc --noEmit` and `npx expo-doctor` pass after dependency alignment.
