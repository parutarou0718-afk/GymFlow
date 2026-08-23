# Program Module Extraction Design

## Goal

Promote the existing persisted `WorkoutTemplate` / Plan capability to the independent Program domain without changing stored records, IDs, UI layout, Workout behavior, or matching behavior.

## Chosen approach: compatible domain facade

`src/modules/program` exposes the Program public API while retaining `WorkoutTemplate` as the canonical persisted shape. `Program` and its nested types are compatibility aliases for existing template types. The module's service accepts only a narrow `ProgramStore` port and delegates CRUD to the existing `templates` repository.

This is preferred to either a new Program table (which would require a migration and break `templateId` references) or a broad rename (which would make this extraction a risky cross-module refactor).

## Public API

`createProgramService(store)` returns:

- `listPrograms(): Promise<Program[]>`
- `getProgram(id: string): Promise<Program | null>`
- `createProgram(program: Program): Promise<Program>`
- `updateProgram(program: Program): Promise<Program>`
- `deleteProgram(id: string): Promise<void>`

`Program`, `ProgramExercise`, and `ProgramTargetSet` are exported from the module. They remain structurally compatible with `WorkoutTemplate`, `TemplateExercise`, and `TargetSet` respectively.

## Data compatibility

No table, column, store property, seed, or ID is renamed. SQLite continues using the `templates` table and the Web preview continues using its in-memory `templates` collection. Existing session `templateId` values remain valid and Workout keeps its current behavior unchanged.

## UI boundary

The existing Plans screen and template form construct a Program service from `useStores()` and use only its public methods. They no longer destructure or call `store.templates`. This is a dependency-boundary change only: no navigation, visual layout, copy, or form behavior changes.

## Out of scope

History-to-Program conversion, Program-level Gym Matching, Social, maps, Workout lifecycle changes, matching changes, and UI redesign are explicitly deferred.

## Verification

Tests will prove Program CRUD preserves IDs and existing storage semantics, and source-level boundary tests will reject direct `store.templates` use from Plans and the template form. Full test, TypeScript, Expo doctor, and Web export checks complete the phase.
