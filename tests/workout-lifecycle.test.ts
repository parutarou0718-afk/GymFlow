import assert from 'node:assert/strict';
import test from 'node:test';
import { completeSession, pauseSession, resumeSession } from '../src/lib/workout-lifecycle';
import { createWebStore } from '../src/db/web-store';

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

test('persists pause, reload, resume, pause, resume, and completion through the store', async () => {
  const store = createWebStore();
  const session = {
    id: 'quick-session-lifecycle', templateId: null, templateName: 'Quick Workout',
    sourceType: 'quick' as const, sourceId: null, gymId: null, visibility: 'private' as const,
    status: 'active' as const, startedAt: 1_000, pausedDuration: 0, exercises: [],
  };
  await store.sessions.create(session);

  const paused = pauseSession((await store.sessions.get(session.id))!, 1_100);
  await store.sessions.updateStatus(session.id, paused.status, { pausedAt: paused.pausedAt });
  await store.events.record({ id: 'event-paused', eventType: 'WORKOUT_PAUSED', entityType: 'workout', entityId: session.id, createdAt: 1_100, payload: {} });

  const restored = await store.sessions.get(session.id);
  assert.equal(restored?.pausedAt, 1_100);
  const resumed = resumeSession(restored!, 1_160);
  await store.sessions.updateStatus(session.id, resumed.status, { pausedAt: undefined, pausedDuration: resumed.pausedDuration });

  const pausedAgain = pauseSession((await store.sessions.get(session.id))!, 1_200);
  await store.sessions.updateStatus(session.id, pausedAgain.status, { pausedAt: pausedAgain.pausedAt });
  const resumedAgain = resumeSession((await store.sessions.get(session.id))!, 1_240);
  await store.sessions.updateStatus(session.id, resumedAgain.status, { pausedAt: undefined, pausedDuration: resumedAgain.pausedDuration });

  const completed = completeSession((await store.sessions.get(session.id))!, 1_300, session.startedAt);
  await store.sessions.updateStatus(session.id, completed.status, { completedAt: completed.completedAt, duration: completed.duration, pausedDuration: completed.pausedDuration });
  const history = await store.sessions.get(session.id);
  assert.equal(history?.status, 'completed');
  assert.equal(history?.pausedDuration, 100);
  assert.equal(history?.duration, 200);
});
