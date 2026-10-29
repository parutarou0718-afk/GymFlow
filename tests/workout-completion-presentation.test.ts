import assert from "node:assert/strict";
import test from "node:test";
import type { WorkoutSession } from "../src/modules/workout";
import {
  formatCompletionDuration,
  getCompletedExerciseCount,
  getCompletedVolume,
  getReplacementCount,
} from "../src/lib/workout-completion-presentation";

const completedSession: WorkoutSession = {
  id: "completed-session",
  templateId: "program-a",
  templateName: "Strength Day",
  status: "completed",
  startedAt: 0,
  completedAt: 4_320_000,
  exercises: [
    {
      id: "original-entry",
      exerciseId: "bench_press",
      order: 0,
      sets: [
        { setIndex: 0, weight: 80, reps: 8, completed: true },
        { setIndex: 1, weight: 80, reps: 8, completed: true },
      ],
    },
    {
      id: "replacement-entry",
      exerciseId: "dumbbell_bench_press",
      order: 1,
      replacedFromExerciseId: "bench_press",
      sets: [
        { setIndex: 0, weight: 30, reps: 8, completed: true },
        { setIndex: 1, weight: 30, reps: 8, completed: false },
      ],
    },
    {
      id: "unfinished-entry",
      exerciseId: "row",
      order: 2,
      sets: [{ setIndex: 0, weight: 50, reps: 10, completed: false }],
    },
  ],
};

test("M21 Slice 5 summarizes completed facts and replacement provenance", () => {
  assert.equal(
    formatCompletionDuration(
      completedSession.startedAt,
      completedSession.completedAt,
    ),
    "1 hr 12 min",
  );
  assert.equal(getCompletedExerciseCount(completedSession), 2);
  assert.equal(getCompletedVolume(completedSession), 1_520);
  assert.equal(getReplacementCount(completedSession), 1);
});

test("M21 Slice 5 uses stable duration fallback for invalid completion timestamps", () => {
  assert.equal(
    formatCompletionDuration(1_000, undefined),
    "Duration unavailable",
  );
  assert.equal(formatCompletionDuration(2_000, 1_000), "Duration unavailable");
});
