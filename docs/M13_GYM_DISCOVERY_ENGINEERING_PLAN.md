# GymFlow M13 Engineering Plan — Gym Discovery

## Boundary

Implement M13 only after the M12 checkpoint. Do not add a real external provider or integrate M14 flows.

## Implementation sequence

1. Create `src/modules/gym-discovery/{types,ports,discovery-service,index}.ts`.
   - Define external result/reference/status types and default unavailable provider.
   - Define a narrow persistence/read port for links and inject Gym public service.
2. Add additive migration ledger version for `gym_external_links`.
   - Columns: `id`, `gym_id`, `provider`, `external_place_id`, optional raw metadata snapshot, timestamps.
   - Unique `(provider, external_place_id)` only; do not add `UNIQUE(gym_id)`. Preserve all existing Gym rows, IDs, and `templates`.
3. Implement Web and SQLite link stores with identical conflict semantics.
4. Implement service operations in this order:
   - search/details delegate only to provider;
   - lookup resolves existing link;
   - import validates candidate metadata, then calls a dedicated import persistence port that atomically creates the Gym and link;
   - link validates Gym existence through `GymService.getGym`, then writes only the link and rejects cross-Gym reference conflicts;
   - do not update legacy `Gym.externalPlaceId` during a Link.
5. Add a minimal development validation page. It must not read `store.gyms` or SQLite directly.
6. Add regression tests before each implementation step:
   - default provider status;
   - empty search vs unavailable;
   - import idempotency and failed link persistence leaving no orphan Gym;
   - link conflict Gym A → Gym B;
   - invalid provider coordinates omitted;
   - migration fresh/existing/idempotent;
   - Web/SQLite semantic parity and UI public-API boundary.
7. Verify with `npm test`, `npx tsc --noEmit`, `npx expo-doctor`, `npx expo export --platform web`.

## Commit

Create one checkpoint only after the complete suite passes:

```text
feat: add gym discovery and external place linking
```
