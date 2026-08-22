import assert from 'node:assert/strict';
import test from 'node:test';
import { completeSession, pauseSession, resumeSession } from '../src/lib/workout-lifecycle';

test('accumulates multiple pause periods before completion', () => {
  const paused = pauseSession({ status: 'active', pausedDuration: 20 }, 1_000);
  const resumed = resumeSession(paused, 1_030);
  const pausedAgain = pauseSession(resumed, 1_050);
  const completed = completeSession(pausedAgain, 1_070, 900);

  assert.equal(completed.status, 'completed');
  assert.equal(completed.pausedDuration, 70);
  assert.equal(completed.completedAt, 1_070);
  assert.equal(completed.duration, 100);
});

test('includes an open paused interval when completing a session', () => {
  const completed = completeSession({ status: 'paused', pausedAt: 300, pausedDuration: 40 }, 360, 0);

  assert.equal(completed.pausedDuration, 100);
  assert.equal(completed.pausedAt, undefined);
  assert.equal(completed.duration, 260);
});
