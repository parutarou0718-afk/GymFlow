import assert from 'node:assert/strict';
import test from 'node:test';
import { completeSession, pauseSession, resumeSession } from '../src/lib/workout-lifecycle';
import { createWebStore } from '../src/db/web-store';

test('accumulates multiple pause periods before completion', () => {
  const paused = pauseSession({ status: 'active', pausedDuration: 20 }, 20_000);
  const resumed = resumeSession(paused, 50_000);
  const pausedAgain = pauseSession(resumed, 80_000);
  const completed = completeSession(pausedAgain, 100_000, 0);

  assert.equal(completed.status, 'completed');
  assert.equal(completed.pausedDuration, 70);
  assert.equal(completed.completedAt, 100_000);
  assert.equal(completed.duration, 30);
});

test('includes an open paused interval when completing a session', () => {
  const completed = completeSession({ status: 'paused', pausedAt: 300_000, pausedDuration: 40 }, 360_000, 0);

  assert.equal(completed.pausedDuration, 100);
  assert.equal(completed.pausedAt, undefined);
  assert.equal(completed.duration, 260);
});

test('stores an active workout duration in seconds when timestamps are milliseconds', () => {
  const completed = completeSession({ status: 'active' }, 3_000, 0);

  assert.equal(completed.duration, 3);
});

test('persists pause, reload, resume, pause, resume, and completion through the store', async () => {
  const store = createWebStore();
  const session = {
    id: 'quick-session-lifecycle', templateId: null, templateName: 'Quick Workout',
    sourceType: 'quick' as const, sourceId: null, gymId: null, visibility: 'private' as const,
    status: 'active' as const, startedAt: 100_000, pausedDuration: 0, exercises: [],
  };
  await store.sessions.create(session);

  const paused = pauseSession((await store.sessions.get(session.id))!, 110_000);
  await store.sessions.updateStatus(session.id, paused.status, { pausedAt: paused.pausedAt });
  await store.events.record({ id: 'event-paused', eventType: 'WORKOUT_PAUSED', entityType: 'workout', entityId: session.id, createdAt: 110_000, payload: {} });

  const restored = await store.sessions.get(session.id);
  assert.equal(restored?.pausedAt, 110_000);
  const resumed = resumeSession(restored!, 160_000);
  await store.sessions.updateStatus(session.id, resumed.status, { pausedAt: undefined, pausedDuration: resumed.pausedDuration });

  const pausedAgain = pauseSession((await store.sessions.get(session.id))!, 200_000);
  await store.sessions.updateStatus(session.id, pausedAgain.status, { pausedAt: pausedAgain.pausedAt });
  const resumedAgain = resumeSession((await store.sessions.get(session.id))!, 240_000);
  await store.sessions.updateStatus(session.id, resumedAgain.status, { pausedAt: undefined, pausedDuration: resumedAgain.pausedDuration });

  const completed = completeSession((await store.sessions.get(session.id))!, 300_000, session.startedAt);
  await store.sessions.updateStatus(session.id, completed.status, { completedAt: completed.completedAt, duration: completed.duration, pausedDuration: completed.pausedDuration });
  const history = await store.sessions.get(session.id);
  assert.equal(history?.status, 'completed');
  assert.equal(history?.pausedDuration, 90);
  assert.equal(history?.duration, 110);
});
