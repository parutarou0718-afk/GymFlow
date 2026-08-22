import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';

test('creates seeded templates and completed history data', async () => {
  const store = createWebStore();

  const [templates, sessions, workoutCount, totalVolume] = await Promise.all([
    store.templates.getAll(),
    store.sessions.getAll(),
    store.sessions.getTotalWorkouts(),
    store.sessions.getTotalVolume(),
  ]);

  assert.ok(templates.length >= 2);
  assert.equal(sessions.length, 1);
  assert.equal(workoutCount, 1);
  assert.ok(totalVolume > 0);
});

test('keeps template CRUD changes in the current in-memory store', async () => {
  const store = createWebStore();
  const template = {
    id: 'web-template-test',
    name: 'Temporary Test Plan',
    description: 'Created during the preview session',
    exercises: [],
    createdAt: 1,
    updatedAt: 1,
  };

  await store.templates.create(template);
  assert.equal((await store.templates.get(template.id))?.name, template.name);

  await store.templates.update({ ...template, name: 'Updated Test Plan', updatedAt: 2 });
  assert.equal((await store.templates.get(template.id))?.name, 'Updated Test Plan');

  await store.templates.delete(template.id);
  assert.equal(await store.templates.get(template.id), null);
});

test('writes a pending snapshot to the in-memory sync queue', async () => {
  const store = createWebStore();
  const session = (await store.sessions.getAll())[0];
  assert.ok(session);

  await store.sync.saveSnapshot(session.id, {
    schemaVersion: 1,
    sessionId: session.id,
    planId: session.templateId,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt ?? null,
    exercises: [],
    totalVolume: session.totalVolume ?? 0,
    duration: session.duration ?? 0,
  });

  const pending = await store.sync.getPending();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].sessionId, session.id);
});
