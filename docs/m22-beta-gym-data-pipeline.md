# M22.2 Beta Gym Data Pipeline

## Purpose

M22.2 lets an operator validate, dry-run, and safely import a small curated Gym cohort into GymFlow. It is operator tooling, not a consumer editing surface, admin CMS, discovery integration, or crowdsourcing system.

## Input and identity

The canonical format is versioned JSON under `data/beta-gyms/`. CSV is supported as operator-friendly input and is converted to the same canonical model before validation, planning, and apply.

A Gym is identified by either a stable `operatorGymKey` or a complete `(externalProvider, externalPlaceId)` pair. A re-import never changes an existing `operatorGymKey`. If both identities are supplied, they must resolve to the same existing Gym; otherwise validation fails and no mutation occurs. Display name and file position are never identifiers.

Inventory is identified by Gym plus canonical GymFlow `equipmentId`. An optional equipment name is checked against that canonical record; arbitrary text never creates Equipment or triggers fuzzy matching.

## Validation, plan, and apply

The import module follows one path for JSON and CSV:

```text
parse → normalize → validate whole batch → ImportPlan → apply
```

Validation returns source-located errors and produces zero writes. A dry run prints create/update/unchanged counts and warnings from the deterministic ImportPlan. Apply uses existing GymService and InventoryService only after validation succeeds. Re-importing identical input leaves logical state unchanged; corrections update the same Gym or Gym+Equipment record. Missing inventory rows are non-destructive and do not remove existing records.

## Provenance

`Gym.operatorGymKey`, `Gym.sourceName`, and `Gym.sourceRef` are additive persisted fields. Together with the existing inventory `verified` and `verifiedAt`, they answer which batch/source supplied a Gym and when an inventory fact was verified.

M22.2 provenance is **batch/Gym-level provenance**. It does not claim separate source references for individual Inventory facts. A later operations milestone may add fact-level provenance if needed.

## Operator workflow

```bash
npm run gym-data:validate -- data/beta-gyms/example.json
npm run gym-data:import -- data/beta-gyms/example.json
```

Validate is dry-run only. Import repeats validation, prints the plan summary, and applies only a valid batch. The CLI is Node-only and is not bundled into the Expo application.

## Beta Gym readiness checklist

- [ ] Gym identity verified
- [ ] Address and branch verified
- [ ] Inventory reviewed
- [ ] Required Equipment mapped to canonical IDs
- [ ] Capabilities reviewed where known
- [ ] Source recorded
- [ ] `verifiedAt` recorded

The Beta cohort should remain small and curated before inviting users: high-confidence Gym data is preferable to broad, uncertain coverage.

## Limitations

The default import is non-destructive; it does not delete omitted Inventory rows. It does not provide database-wide multi-entity transactional rollback where the current store cannot guarantee it, but it guarantees full validation before writes and convergent re-import behavior. It does not support an admin UI, cloud sync, public Gym discovery, or automated Equipment inference.
