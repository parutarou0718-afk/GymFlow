# M1 Workout Record Stabilization Design

## Goal

Make Workout Session a reliable, persistent domain that supports quick and template-based workouts, correctly survives pause/exit/resume, records completion or discard, and emits local domain events. Gym, equipment, social, matching, cloud sync, and real analytics remain out of scope.

## Session model

`WorkoutSession` gains `discarded` status and persistent lifecycle fields: `pausedAt`, `pausedDuration`, `completedAt`, `sourceType`, `sourceId`, `gymId`, and `visibility`. `finishedAt` is replaced in application types by `completedAt` while continuing to map to the existing SQLite `finished_at` column for backward compatibility. M1 writes `gymId = null` and `visibility = 'private'`. `sourceType` is `quick` or `template`; `sourceId` is null for quick workouts and the template ID otherwise.

Discarded sessions are retained locally with status `discarded`; they are not shown in active-session lookup or workout history. Completed sessions alone contribute to statistics and history.

## Lifecycle and timing

Lifecycle mutations are centralized in the workout engine and persisted through explicit session-store methods. Pause writes `status = paused` and `pausedAt = now`. Resume adds `now - pausedAt` to `pausedDuration`, clears `pausedAt`, and writes `status = active`. Completing from paused first includes the final paused interval, then sets `completedAt`, `duration = completedAt - startedAt - pausedDuration`, and `status = completed`.

Elapsed display is derived from persisted timestamps rather than an accumulated React timer: while active it is `now - startedAt - pausedDuration`; while paused it is `pausedAt - startedAt - pausedDuration`. A one-second UI tick only refreshes that derived value. Reloading a paused session therefore resumes correctly without an in-memory pause reference.

## Stores and persistence

The `GymFlowStore` interface is extended rather than bypassed. Session operations cover creation, lifecycle transition, exercise add/remove/reorder, set add/remove/update, and discard. SQLite schema version increments and adds columns to `sessions`; a `domain_events` table records event metadata and payload. Existing databases receive additive migrations. The Web store implements the same interface in memory and starts from reset-on-refresh demo data.

## Domain events and analytics

Each successful lifecycle action records one local event: `WORKOUT_STARTED`, `WORKOUT_PAUSED`, `WORKOUT_RESUMED`, `WORKOUT_COMPLETED`, or `WORKOUT_DISCARDED`. Event records contain an ID, event type, entity type `workout`, session ID, timestamp, and payload. A no-op `Analytics.track()` is called for the equivalent product analytics event; no SDK is introduced.

## UI behavior

Quick Workout creates an active empty session titled Quick Workout, then opens the active-workout screen. The active workout permits selecting and adding exercises, deleting and reordering exercises, adding/removing sets, changing weights and reps, and toggling completion. Finish requires confirmation. Discard is available from active and paused states, requires confirmation, and returns Home; cancelling confirmation leaves the session untouched. The paused screen offers Resume, Finish, and Discard.

The Home active banner resumes the latest active or paused session. App backgrounding pauses an active session once; returning to the app does not auto-resume it.

## Verification

Automated tests cover quick-session creation, lifecycle transitions including multiple pauses, completed duration calculation, discard behavior, in-memory store mutation, and event recording. Manual browser checks cover the PRD scenarios A-E. Native SQLite migration and lifecycle persistence are checked through TypeScript and Expo Web bundle validation; mobile-device testing remains a final manual check.

## Out of scope

No Gym/equipment data, recommendations, social sharing, cloud synchronization, RLS, real analytics SDK, personal records, or visibility controls beyond writing the default private field.
