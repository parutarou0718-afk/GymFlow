# M21 Slice 4: Active Workout Contextual Replacement Design

## Goal

Make the existing in-Workout replacement flow understandable and discoverable while preserving its existing Workout and replacement semantics.

## Scope

- Display the active Workout's session Gym through `GymService`; `WorkoutSession.gymId` is the sole Gym authority.
- Productize the existing `WorkoutReplacementService` flow: entry point, reason selection, named candidates, explicit candidate selection, confirmation, blocker and retry states.
- Explain partial replacement before confirmation: completed sets remain on the original exercise and pending sets move to the selected replacement.
- Use existing Exercise, Gym, Workout, and Workout Replacement public services only.

## Locked semantics

- Current Gym never replaces, clears, or overrides `WorkoutSession.gymId`.
- Candidate ordering stays as returned; the first returned candidate may be marked Recommended but is never auto-selected or re-ranked.
- Existing zero-completed and partial-completed replacement, load reset, provenance, IDs, event, and atomic persistence semantics remain unchanged.
- `equipment_occupied` is a user reason only and never mutates Inventory.
- No candidate produces no Workout mutation and no synthetic fallback or Keep original action.
- No new public API.

## UI behavior

- Header: `Training at <Gym>` when resolved, `No training location` for null, and `Training location unavailable` for an unresolved Gym ID.
- A pending ExerciseBlock exposes `Replace Exercise`; completed-only entries do not.
- The dialog presents user-readable reason labels, candidate names, optional lightweight existing-status copy, and `Use this` selection followed by confirmation.
- Candidate name resolution failure displays `Exercise unavailable`, never a raw ID.
- A partial replacement confirmation states the original and replacement names, without maintaining a shadow mutation model. After successful service mutation, the UI refreshes from WorkoutService.
- Failure leaves the authoritative Workout untouched and displays a retryable error.

## Tests

- Real Web Store behavioral coverage for zero-completed and partial replacement, including session Gym preservation.
- Regression proving session Gym A remains replacement context after Current Gym changes to B.
- No-candidate behavior leaves Workout unchanged.
- `equipment_occupied` does not mutate Inventory.
- Static UI boundary coverage verifies public-service use and no direct Store repository access.
