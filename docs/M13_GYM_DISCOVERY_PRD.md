# GymFlow M13 PRD — Gym Discovery

## Goal

Discover real-world gyms through an external provider and turn them into reviewable candidates that can be explicitly imported into, or linked with, GymFlow. M13 does not select a current gym or alter workout, inventory, matching, or user-gym state.

## Core model

`ExternalGymResult` is provider metadata, never a GymFlow `Gym`.

```text
manual query / manual origin
→ ExternalGymProvider
→ ExternalGymResult
→ explicit Import or Link
→ Gym public API
→ GymFlow Gym
```

`Gym.id` remains the domain primary key. `externalProvider + externalPlaceId` is external mapping metadata only.

## Public API

`src/modules/gym-discovery` exposes:

```ts
searchExternalGyms(input): Promise<ExternalGymSearchResult>
getExternalGymDetails(ref): Promise<ExternalGymDetailsResult>
importExternalGym(ref, input?): Promise<Gym>
linkExternalGym(gymId, ref): Promise<Gym>
getExternalGymLink(ref): Promise<Gym | null>
```

The module consumes only `ExternalGymProvider` and Gym public API. It must not access `store.gyms` or SQLite directly.

## Provider port and statuses

```ts
interface ExternalGymProvider {
  search(input: ExternalGymSearchInput): Promise<ExternalGymSearchResult>;
  getDetails(ref: ExternalGymRef): Promise<ExternalGymDetailsResult>;
}
```

The default provider returns `{ status: 'not_configured' }`. `not_configured` is distinct from `{ status: 'available', results: [] }`.

An external reference contains non-empty `provider` and `externalPlaceId`. Results may carry name, address, optional complete coordinates, and provider metadata.

## Import and Link rules

- Import creates a new GymFlow Gym through `GymService.createGym`.
- Link validates the existing Gym through `GymService.getGym`, then writes only the external-link record.
- Both operations first resolve existing linkage by `(provider, externalPlaceId)`.
- If the reference is already linked to Gym A, importing again returns Gym A idempotently; linking it to Gym B rejects with a conflict error.
- Import may use result name/address/coordinates only after Gym runtime validation. It must not create inventory, set home/favorite, match a program, or start a workout.
- Link does not update `Gym.name`, `address`, coordinates, or legacy `Gym.externalPlaceId` unless a future explicit enrichment action is introduced.
- Coordinates are written only as a complete pair; invalid or partial provider coordinates are omitted from import input rather than persisted.

## Persistence

M13 introduces a `gym_external_links` table with a unique `(provider, external_place_id)` constraint. A Gym may have multiple external references from one or more providers; `gym_id` is not unique. Existing `gyms.external_place_id` remains compatibility metadata and is not made the source of truth for provider-scoped identity. Migration is additive and ordered through the existing ledger.

Import is one logical operation: create Gym plus create its external link. Its persistence port must commit both records atomically. If the link cannot be persisted, no new Gym may remain. The Web implementation provides equivalent all-or-nothing semantics.

## Minimal validation UI

A development-only Discovery page accepts query and manual coordinates, shows provider status/results/details, and provides explicit Import or Link actions. It uses only Gym Discovery and Gym public APIs.

## Out of scope

GPS, permissions, maps, Places SDKs, external provider credentials, current gym, inventory creation, user-gym mutations, matching, workout integration, Auth, Cloud, and Social.

## Acceptance

- Provider unavailable is structured `not_configured`.
- Search no-results is distinct from unavailable.
- Same reference cannot silently link to two Gyms.
- Repeated import is idempotent.
- A link persistence failure leaves no orphan imported Gym.
- Imported Gym remains a normal, independently editable GymFlow Gym.
- Native/Web semantics, tests, TypeScript, Expo Doctor, and Web export pass.
