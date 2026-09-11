# GymFlow

**A local-first workout application developed as a long-running, checkpoint-driven product exercise.** GymFlow supports a documented training flow: select a current gym, inspect its equipment inventory, choose a program, evaluate whether it is executable at that gym, create an adapted program when needed, complete a workout, and record a gym visit.

The product is designed around explicit domain boundaries rather than one all-purpose data layer. Native clients persist data with Expo SQLite; the web implementation uses in-memory seed data for preview. Auth, cloud synchronization, and production social UI are deliberately deferred rather than presented as completed capabilities.

## My role and development approach

GymFlow was developed through **controlled agent-assisted development**. I defined the product problem, requirements, scope, architecture direction, module boundaries, data and persistence constraints, priorities, and acceptance conditions. Coding agents implemented bounded tasks; I reviewed tests, observed behavior, regression results, and commits before accepting or rejecting a checkpoint.

The repository documents a continuous M1–M20 delivery sequence rather than a one-shot build. Each checkpoint was kept small enough to verify and reverse, with explicit follow-up risks instead of premature expansion into Auth or Cloud Sync.

## What this project demonstrates

- **Requirement definition and scope control:** the workout lifecycle was designed before broader gym, social, or cloud concerns were added; deferred work remains explicit.
- **Problem structuring:** product behavior is split into public modules for Workout, Program, Gym, Inventory, Matching, Adaptation, User, Social, Sharing, and related orchestration.
- **Local-first data design:** SQLite-backed native persistence, web preview behavior, additive schema evolution, and compatibility constraints are considered separately.
- **Risk identification:** the architecture audit records migration, transaction, UI-to-store, and future identity/synchronization risks instead of treating the current prototype as production-ready.
- **Validation-led iteration:** the handoff records `npm test`, TypeScript checking, Expo Doctor, and web export as baseline checks for subsequent checkpoints.

## Engineering evidence

The [handoff document](docs/HANDOFF.md) records the M1–M20 core delivery sequence, public API boundaries, compatibility constraints, verification commands, and open decisions. The [core architecture audit](CORE_ARCHITECTURE_AUDIT.md) records module ownership, SQLite schema ownership, known persistence risks, and criteria for safely deferring Auth and Cloud Sync.

The current documented baseline commands are:

```bash
npm test
npx tsc --noEmit
npx expo-doctor
npx expo export --platform web
```

## Technology and architecture

- Expo and React Native with Expo Router
- TypeScript with strict compiler settings
- Expo SQLite for native persistence and an in-memory web store for preview
- Public module APIs as boundaries between UI, domain behavior, and storage

## Run locally

Requirements:

- Node.js and npm
- An Expo-compatible Android, iOS, or web development environment

```bash
npm install
npm run start
```

To launch a platform-specific development session:

```bash
npm run android
npm run ios
npm run web
```

## Related portfolio projects

- [Research Workspace](https://github.com/parutarou0718-afk/research-workspace) — a structured AI workflow with review gates and regression evidence.
- [Aetheria](https://github.com/parutarou0718-afk/aetheria) — an experiment in constraining LLM-driven actions before they enter application state.
- [PM Agent Skills](https://github.com/parutarou0718-afk/pm-agent-skills) — the reusable Discovery → Scope Reduction → PRD → Plan → Acceptance method behind controlled agent-assisted development.

## Current boundaries

GymFlow is a local-first product exercise, not a finished cloud platform. The repository intentionally defers Auth/Cloud identity mapping, durable synchronization, and production-grade social surfaces until their data ownership, privacy, migration, and module-boundary requirements are defined.
