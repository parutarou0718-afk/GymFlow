# M22.2 Beta Gym Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a validated, idempotent JSON/CSV operator pipeline that imports curated Gyms and canonical Equipment inventory without changing training semantics.

**Architecture:** A pure `gym-data-import` module parses JSON or CSV into one canonical input, validates the whole batch, and returns a deterministic ImportPlan. Its apply stage uses GymService and InventoryService; Node-only scripts expose dry-run and import commands.

**Tech Stack:** TypeScript, Node `fs`, existing GymFlow Web/SQLite store services, Node test runner.

## Global Constraints

- M22.2 only; do not implement M22.3, cloud sync, CMS, discovery, crowdsourcing, or Social.
- JSON is canonical; CSV maps to the same model and never has separate business rules.
- `operatorGymKey` is stable and immutable on normal re-import.
- Both supplied Gym identities must resolve to one Gym or validation fails.
- Unknown/archived Equipment, duplicate batch identity, invalid facts, and invalid timestamps cause zero writes.
- Omission is not deletion; use only existing status semantics.
- Provenance is Gym/batch-level, not fact-level Inventory provenance.

---

### Task 1: Add additive Gym provenance persistence

**Files:** `src/modules/gym/types.ts`, `src/modules/gym/gym-service.ts`, `src/db/types.ts`, `src/db/web-store.ts`, `src/db/database.ts`, `src/db/migrations.ts`, `tests/m22-gym-data-import.test.ts`.

- [ ] Write migration/store parity tests for `operatorGymKey`, `sourceName`, and `sourceRef`.
- [ ] Verify failure before fields/migration exist.
- [ ] Add nullable persisted fields and migration only; keep prior Gym records readable.
- [ ] Run focused tests.

### Task 2: Build pure input validation and ImportPlan

**Files:** Create `src/modules/gym-data-import/*`; test `tests/m22-gym-data-import.test.ts`.

- [ ] Write failing tests for a valid plan, unknown Equipment, duplicate inventory, invalid quantities/status/coordinates, and conflicting dual Gym identity.
- [ ] Implement parse/normalize/validate/plan with source-located errors and no store mutation.
- [ ] Run focused tests.

### Task 3: Apply idempotent and corrective plans

**Files:** `src/modules/gym-data-import/*`; test `tests/m22-gym-data-import.test.ts`.

- [ ] Write failing tests for initial import, identical re-import, correction, non-destructive omission, and closed Gym preservation.
- [ ] Apply plans through GymService and InventoryService, preserving unchanged records.
- [ ] Run focused tests.

### Task 4: CLI and sample dataset

**Files:** Create `scripts/gym-data-cli.ts`, `data/beta-gyms/example.json`; modify `package.json`.

- [ ] Write a failing CLI-format test or run the missing command to demonstrate its absence.
- [ ] Add validate/import scripts using a Node-only store adapter and deterministic summaries.
- [ ] Run sample validate and import in an isolated process.

### Task 5: Prove matching integration and validate release boundaries

**Files:** `tests/m22-gym-data-import.test.ts`, `docs/m22-beta-gym-data-pipeline.md`.

- [ ] Write integration tests proving imported required Equipment yields `fully_executable` and an alternate Inventory yields `requires_adaptation`.
- [ ] Run all M21/M22 tests plus TypeScript, Expo Doctor, and Web export.
- [ ] Review scope, commit once as `feat: add curated gym data import pipeline`, and stop.
