# M21 Slice 5 — Workout Completion Summary Design

## Goal

Turn a successfully persisted Workout completion into a reload-safe summary without changing Workout, Gym, Program, replacement, or Visit semantics.

## Boundaries

- `WorkoutService.finishWorkout()` remains the sole completion authority. The UI navigates only after it resolves with the persisted completed session.
- Failed completion leaves the active Workout visible. It creates neither a completion summary nor an additional Gym Visit.
- The summary route accepts only `sessionId`, reloads the completed session via the public Workout service, and rejects missing or non-completed sessions.
- `WorkoutSession.gymId` is the Gym authority. A null Gym is a valid Quick Workout state; an unresolved non-null Gym is shown as unavailable.
- Metrics use completed sets only. A replacement is counted once for each exercise entry with `replacedFromExerciseId`, including a partial replacement.
- The page has no Store bypasses and no new public domain API. Entity names are resolved through existing Gym, Exercise, and Program services.

## Route and navigation

`app/active-workout.tsx` owns navigation from the finished active session to `/workout-complete?sessionId=<id>`. The hook returns the persisted completed session through the UI callback, so a route cannot be constructed before `finishWorkout()` succeeds.

`app/workout-complete.tsx` loads by `sessionId` through `WorkoutService.getWorkoutHistoryDetail()`. It displays a safe unavailable state for an absent, active, paused, or discarded session.

Actions are routing-only:

- View Workout opens `/session-detail?sessionId=<id>`.
- Train Again opens `/program-detail?programId=<templateId>` for template-backed sessions so Gym matching runs again; Quick Workouts return to the existing Home Quick Workout entry and never acquire a Gym automatically.
- Home replaces the stack with `/(tabs)`.

## Presentation helper

`src/lib/workout-completion-presentation.ts` is pure. It accepts a persisted Workout Session and derives whole-minute duration copy, completed exercise count, completed-only volume, and replacement provenance count. Entity naming remains in the route, so no raw IDs appear in user-facing copy.

## Verification

Use Web Store/module services for normal completion, partial replacement, no-Gym Quick Workout, and atomic completion failure. Add pure presentation tests and UI boundary/routing tests. Finish with full test, type, Expo Doctor, web export, and clean-status validation.
