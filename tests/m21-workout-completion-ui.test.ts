import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

test("M21 Slice 5 reloads workout completion by sessionId through public services", async () => {
  const source = await readFile(
    resolve(process.cwd(), "app/workout-complete.tsx"),
    "utf8",
  );

  assert.match(source, /getWorkoutHistoryDetailForOwner\(user\.id, sessionId\)/);
  assert.match(source, /createGymService/);
  assert.match(source, /createExerciseService/);
  assert.doesNotMatch(source, /store\.(sessions|events|gyms|exercises)/);
});

test("M21 Slice 5 only routes a persisted completion to its summary", async () => {
  const hook = await readFile(
    resolve(process.cwd(), "src/hooks/useWorkoutEngine.ts"),
    "utf8",
  );
  const screen = await readFile(
    resolve(process.cwd(), "app/active-workout.tsx"),
    "utf8",
  );

  assert.match(
    hook,
    /const completed = await workoutService\.finishWorkoutForOwner\(user\.id, session\.id\)/,
  );
  assert.match(hook, /onFinish\(completed\)/);
  assert.match(screen, /workout-complete/);
});

test("M21 Slice 5 preserves Train Again routing and safe summary fallback", async () => {
  const source = await readFile(
    resolve(process.cwd(), "app/workout-complete.tsx"),
    "utf8",
  );

  assert.match(source, /program-detail/);
  assert.match(source, /\(tabs\)/);
  assert.match(source, /Workout summary unavailable/);
  assert.match(source, /No training location/);
  assert.match(source, /Training location unavailable/);
});
