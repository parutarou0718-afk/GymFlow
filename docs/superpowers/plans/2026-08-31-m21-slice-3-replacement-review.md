# M21 Slice 3 Replacement Review Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present replacement reasons and candidates in understandable language while preserving explicit replacement decisions.

**Architecture:** A pure helper translates existing match evidence and resolved display-name maps into copy only. The screen resolves names through public Exercise and Equipment services, renders the helper output, and delegates selection and adapted Program creation to existing services.

**Tech Stack:** TypeScript, React Native, Expo Router, node:test, GymFlow public services.

## Global Constraints

- Do not change matching, replacement, adaptation, Workout, or Training Flow semantics.
- Do not add a public domain API or use direct Store repositories in the screen.
- Mark `options[0]` as Recommended without sorting or selecting it.
- Do not expose raw IDs, internal source codes, scores, quality values, or add Keep original.
- Preserve stale guards, review readiness, and original Program immutability.

---

### Task 1: Pure Replacement Review presenter

**Files:**
- Create: `src/lib/replacement-review-presentation.ts`
- Test: `tests/replacement-review-presentation.test.ts`

**Consumes:** `CompatibilityIssue`, existing candidate source facts, resolved name maps.

**Produces:** `presentReplacementReviewItem(item, names)` with user-facing reasons, options, recommendation metadata, and selected-candidate metadata.

- [ ] **Step 1: Write failing presenter tests**

```ts
assert.equal(presentIssue({ code: 'missing_required_equipment', equipmentId: 'barbell' }, names), 'Gym A doesn’t have Barbell.');
assert.equal(presentIssue({ code: 'equipment_availability_unknown', equipmentId: 'barbell' }, { exercises: {}, equipment: {} }), 'Availability for the required equipment is unknown.');
assert.equal(presentReplacementReviewItem(item, names).options[0].isRecommended, true);
```

- [ ] **Step 2: Run the presenter tests**

Run: `npm test -- --test-name-pattern "Replacement Review presentation"`

Expected: fail because the helper does not exist.

- [ ] **Step 3: Implement the pure helper**

```ts
export function presentReplacementReviewItem(item, names) {
  return {
    originalExerciseName: names.exercises[item.originalExerciseId] ?? 'Exercise unavailable',
    reasons: item.match.issues.map(issue => presentIssue(issue, names)),
    selectedExerciseId: item.decision.status === 'selected' ? item.decision.replacementExerciseId : null,
    options: item.options.map((option, index) => ({
      name: names.exercises[option.exerciseId] ?? 'Exercise unavailable',
      isRecommended: index === 0,
      reason: presentCandidateSource(option.sources),
      option,
    })),
  };
}
```

- [ ] **Step 4: Run the presenter tests**

Run: `npm test -- --test-name-pattern "Replacement Review presentation"`

Expected: all presenter tests pass.

### Task 2: Productize the screen and lock its boundary

**Files:**
- Modify: `app/replacement-review.tsx`
- Create: `tests/m21-replacement-review-ui.test.ts`

**Consumes:** Task 1 helper and existing public Exercise, Equipment, Replacement Review, and Training Flow services.

**Produces:** readable reasons and candidate cards; only an explicit `Use this` action calls `selectReplacement`.

- [ ] **Step 1: Write failing screen-boundary tests**

```ts
assert.match(source, /createExerciseService\(store\)/);
assert.match(source, /createEquipmentService\(store\)/);
assert.match(source, /Use this/);
assert.doesNotMatch(source, /store\.(sessions|templates|gyms|equipment|exercises|inventory)/);
assert.doesNotMatch(source, /setReview\(.*options\[0\]/);
```

- [ ] **Step 2: Run the screen-boundary tests**

Run: `npm test -- --test-name-pattern "M21 Replacement Review"`

Expected: fail because the screen currently renders raw IDs and does not resolve public display names.

- [ ] **Step 3: Implement name resolution and rendering**

```ts
const exerciseApi = useMemo(() => createExerciseService(store), [store]);
const equipmentApi = useMemo(() => createEquipmentService(store), [store]);
const presented = presentReplacementReviewItem(item, resolvedNames);
<Button title={presented.selectedExerciseId === option.exerciseId ? 'Selected' : 'Use this'} onPress={() => setReview(reviewApi.selectReplacement(...))} />
```

Collect original, candidate, and issue equipment IDs from the review, resolve them with `getExercise` / `getEquipment`, omit unresolved IDs, and render helper fallbacks.

- [ ] **Step 4: Run the screen-boundary tests**

Run: `npm test -- --test-name-pattern "M21 Replacement Review"`

Expected: all screen-boundary tests pass.

### Task 3: Explicit-decision regression and final validation

**Files:**
- Modify: `tests/m17-replacement-review.test.ts`
- Test: `tests/m17-replacement-review.test.ts`

**Consumes:** Task 1 helper and existing `createReplacementReviewService`.

**Produces:** proof that Recommended remains pending and a chosen non-recommended option remains selected across presentation refreshes.

- [ ] **Step 1: Write failing decision tests**

```ts
const review = service.createReplacementReview({ matchResult: match, programUpdatedAt: 1 });
assert.equal(review.items[0].decision.status, 'pending');
const selected = service.selectReplacement({ review, programExerciseKey: 'entry-a', replacementExerciseId: 'b' });
assert.equal(presentReplacementReviewItem(selected.items[0], names).selectedExerciseId, 'b');
```

- [ ] **Step 2: Run the decision tests and final validation**

Run: `npm test && npx tsc --noEmit && npx expo-doctor && npx expo export --platform web && git status`

Expected: all tests pass, Expo Doctor reports 18/18, web export succeeds, and only Slice 3 files are changed before commit.

- [ ] **Step 3: Commit implementation**

```bash
git add src/lib/replacement-review-presentation.ts app/replacement-review.tsx tests/replacement-review-presentation.test.ts tests/m21-replacement-review-ui.test.ts tests/m17-replacement-review.test.ts
git commit -m "feat: productize replacement review"
```
