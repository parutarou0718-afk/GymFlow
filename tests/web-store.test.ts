import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { exerciseDB } from '../src/lib/exercise-db';

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

test('persists quick workout exercise and set edits across store reloads', async () => {
  const store = createWebStore();
  await store.sessions.create({ id: 'quick-edit', templateId: null, templateName: 'Quick Workout', status: 'active', startedAt: 1, exercises: [] });
  const benchPress = exerciseDB.getById('bench_press')!;

  await store.sessions.addExercise('quick-edit', { id: 'quick-edit-bench', exerciseId: benchPress.id, exercise: benchPress, order: 0, sets: [] });
  await store.sessions.addSet('quick-edit-bench', { setIndex: 0, weight: 50, reps: 8, completed: false });
  await store.sessions.updateSet('quick-edit-bench', 0, { weight: 55, reps: 10, completed: true });

  const restored = await store.sessions.get('quick-edit');
  assert.deepEqual(restored?.exercises[0].sets[0], { setIndex: 0, weight: 55, reps: 10, completed: true });
});
