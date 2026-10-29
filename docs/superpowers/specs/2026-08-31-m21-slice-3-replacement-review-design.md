# M21 Slice 3: Replacement Review Productization Design

## Goal

Turn Replacement Review from an exercise/candidate ID inspection screen into an understandable user decision flow, without changing replacement, adaptation, or Workout domain semantics.

## Scope

- Resolve original exercise, candidate exercise, and issue-related equipment names through existing Exercise and Equipment public services.
- Add a pure UI presentation helper that converts `CompatibilityIssue` and candidate provenance into accurate user-facing copy.
- Present a clear explanation for each replacement needed, a visually marked recommended candidate, other executable candidates, selected state, and no-candidate blockers.
- Preserve all existing actions: only a user tap can select a candidate; adapted Program creation remains available only for a ready review.

## Non-goals and locked semantics

- No new domain or public API.
- No direct Store access in the screen for exercises, equipment, inventory, programs, sessions, or user relationships.
- No automatic candidate selection, fallback to the recommended candidate, or `Keep original` decision.
- No change to explicit decision semantics, stale guards, adaptation validation, or original Program immutability.
- No new candidate ranking, matching, replacement option, or issue interpretation in the domain layer.

## Architecture

The new presentation helper is a pure function. It consumes resolved display names plus the existing domain issue and candidate source facts, and returns labels and explanations only. It owns no state, does not select candidates, and does not mutate a `ReplacementReview`.

`replacement-review.tsx` continues to obtain review state from `ReplacementReviewService` and create an adapted Program through `TrainingFlowService`. On load, it uses existing Exercise and Equipment public services to resolve the IDs included in review items, alternatives, and issues. Missing display entities use neutral fallback phrasing rather than raw IDs.

## Evidence-to-copy mapping

| Domain evidence | User-facing explanation |
| --- | --- |
| `missing_required_equipment` with resolved equipment | `<Gym> doesn’t have <Equipment>.` |
| `equipment_unavailable` with resolved equipment | `<Equipment> is not available here.` |
| `equipment_availability_unknown` with resolved equipment | `Availability for <Equipment> is unknown.` |
| `insufficient_capability` with resolved equipment | `This <Equipment> does not support the required setup.` |
| `unknown_capability` with resolved equipment | `GymFlow cannot confirm whether this <Equipment> supports the required setup.` |
| `missing_preferred_equipment` with resolved equipment | `This Program can still run, but the preferred <Equipment> is unavailable.` |
| Explicit issue without a resolved name | A neutral equivalent such as `Required equipment is unavailable.` |

The helper must not turn unknown availability into absence, preferred equipment into a blocker, or a capability limitation into a missing-equipment claim.

## Candidate presentation

- The first existing option remains the recommendation according to the existing ranked review options; it receives a `Recommended` visual label only.
- Candidate sources map to understandable explanations, for example curated substitution becomes `A closely matched alternative`, and same movement family becomes `Works the same muscle pattern`.
- Internal strings such as `same_movement_family`, quality values, scores, taxonomy IDs, and raw exercise IDs are never normal user-facing text.
- Every option retains a `Use this` action. Tapping it calls the existing `selectReplacement` and records the selected candidate.
- A selected non-recommended option stays selected when the presenter runs again or the screen re-renders.
- An item with no options remains an explicit blocker and offers no synthetic fallback.

## Screen states

- Loading/error: retain the current error behavior, with user-readable fallback text.
- Review item: original exercise name, evidence-based reason, candidate cards, and selection state.
- Ready: show `Create Adapted Program`; this continues to call existing Training Flow creation with the existing review.
- Incomplete: the create action remains disabled until every selectable item has an explicit selection.
- Blocked: clearly state that no suitable replacement is available; creation remains disabled.

## Testing

- Pure presenter tests cover all listed `CompatibilityIssue` mappings, fallback behavior, and source-copy translation without exposing internal codes.
- Service-level review tests retain explicit decision behavior and add coverage that recommendation does not create a decision.
- A behavior test selects a non-recommended candidate, passes the result through presentation again, and proves the selected decision remains unchanged.
- Screen architecture checks continue to prohibit direct Store reads and confirm public service use for name resolution.

## Acceptance criteria

1. Users see names and evidence-based explanations rather than exercise, candidate, or equipment IDs.
2. Every explanation reflects the exact domain evidence strength.
3. Recommended is a label only; it never produces a selected decision.
4. A user may explicitly choose a non-recommended candidate and that decision persists through refresh/render.
5. No-option items are blockers and no `Keep original` or hidden fallback is introduced.
6. Existing stale guards, explicit decision validation, and original Program immutability remain unchanged.
