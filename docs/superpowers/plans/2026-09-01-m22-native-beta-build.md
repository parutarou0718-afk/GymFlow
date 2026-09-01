# M22.3 Native Beta Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure reproducible native Beta builds and document honest, repeatable device acceptance for persistent GymFlow journeys.

**Architecture:** Native builds retain the existing Expo SQLite and SecureStore adapters. EAS profiles describe distribution intent, while public Supabase endpoint configuration is supplied from build environment variables with SecureStore as an explicit local override. The acceptance document separates configured, built, installed, and manually verified states.

**Tech Stack:** Expo SDK 54, EAS Build, expo-sqlite, expo-secure-store, Supabase JS, TypeScript.

## Global Constraints

- Implement only M22.3; do not add M22.4 monitoring, privacy, support, or cloud-sync work.
- Keep `com.gymflow.app`, `gymflow`, and the existing EAS project ID unchanged.
- Never commit Supabase credentials or any service-role key.
- Do not mark unexecuted device scenarios as PASS.
- Do not commit generated iOS/Android native projects.

---

### Task 1: Configure build profiles and native Supabase defaults

**Files:**
- Create: `eas.json`
- Modify: `src/lib/supabase.ts`
- Test: `tests/m22-native-beta-build.test.ts`

**Interfaces:**
- Consumes: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and existing SecureStore override values.
- Produces: Native Supabase initialization that uses SecureStore values first and build environment values only when no local override exists.

- [ ] Write a failing architecture test for the two public variables and the three EAS profiles, then run `npx tsx --test tests/m22-native-beta-build.test.ts`.
- [ ] Add the smallest configuration implementation: SecureStore values win; public build values apply only when no complete local override exists. Add `development`, `preview`, and `production` profiles without credentials.
- [ ] Run `npx tsx --test tests/m22-native-beta-build.test.ts; npx tsc --noEmit`, then commit `chore: configure native beta builds`.

### Task 2: Record native acceptance procedure and actual evidence

**Files:**
- Create: `docs/m22-native-beta-acceptance.md`

**Interfaces:**
- Consumes: native SQLite bootstrap, migration ledger v12, current-user provider, owner-scoped Workout service, and EAS profiles.
- Produces: a device-ready acceptance matrix and exact operator procedure that distinguishes observed results from environment blockers.

- [ ] Include all required iOS/Android scenarios, allowed status vocabulary, fresh-install/process-death/upgrade/account-switch procedure, EAS commands, required public environment variables, and initial evidence state.
- [ ] Run `npx expo config --type public; npx eas config`, then attempt preview Android and iOS EAS builds. Record exact outcomes without inventing credentials.
- [ ] Commit the acceptance document separately as `docs: add native beta acceptance procedure`.

### Task 3: Final validation and evidence review

**Files:**
- Verify: `eas.json`, `src/lib/supabase.ts`, `tests/m22-native-beta-build.test.ts`, `docs/m22-native-beta-acceptance.md`

- [ ] Run `npm test; npx tsc --noEmit; npx expo-doctor; npx expo export --platform web; npx expo config --type public; git status`.
- [ ] Confirm every unexecuted device exercise is `BLOCKED-environment`, not PASS. Report `CONFIGURED`, `BUILT`, `INSTALLED`, and `MANUALLY VERIFIED` independently for each platform, then stop before M22.4.
