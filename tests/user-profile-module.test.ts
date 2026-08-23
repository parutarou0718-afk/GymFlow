import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { createWebStore } from '../src/db/web-store';
import {
  DEFAULT_LOCAL_USER_ID,
  createUserService,
} from '../src/modules/user';

test('UserService bootstraps one stable default user without overwriting profile changes', async () => {
  const service = createUserService(createWebStore());

  const initial = await service.getCurrentUser();
  assert.equal(initial.id, DEFAULT_LOCAL_USER_ID);
  assert.equal(initial.displayName, 'GymFlow User');

  const updated = await service.updateUser(initial.id, { displayName: 'Alex' });
  const reread = await service.getCurrentUser();

  assert.equal(updated.displayName, 'Alex');
  assert.equal(reread.displayName, 'Alex');
  assert.equal((await service.listUsers()).filter(item => item.id === DEFAULT_LOCAL_USER_ID).length, 1);
});

test('UserService creates, partially updates, and archives ordinary users', async () => {
  const service = createUserService(createWebStore());
  const created = await service.createUser({
    displayName: 'Jamie',
    experienceLevel: 'beginner',
    trainingGoals: ['strength', 'strength', 'mobility'],
    preferences: { preferredUnits: 'imperial', defaultRestSeconds: 90 },
  });

  const updated = await service.updateUser(created.id, {
    experienceLevel: 'intermediate',
    privacy: { profileVisibility: 'public' },
  });

  assert.deepEqual(updated.trainingGoals, ['strength', 'mobility']);
  assert.equal(updated.preferences.preferredUnits, 'imperial');
  assert.equal(updated.preferences.defaultRestSeconds, 90);
  assert.equal(updated.privacy.profileVisibility, 'public');
  assert.equal(updated.privacy.workoutVisibilityDefault, 'private');

  const archived = await service.archiveUser(created.id);
  assert.equal(archived.status, 'archived');
  assert.equal((await service.getUser(created.id))?.status, 'archived');
  assert.equal((await service.listUsers()).some(item => item.id === created.id), false);
});

test('UserService always advances updatedAt for a partial update', async () => {
  const originalNow = Date.now;
  let now = 100;
  Date.now = () => now;
  try {
    const service = createUserService(createWebStore());
    const created = await service.createUser({ displayName: 'Timestamp User' });
    const updated = await service.updateUser(created.id, { displayName: 'Renamed Timestamp User' });
    assert.ok(updated.updatedAt > created.updatedAt);
  } finally {
    Date.now = originalNow;
  }
});

test('UserService rejects invalid values and cannot archive the default current user', async () => {
  const service = createUserService(createWebStore());

  await assert.rejects(() => service.createUser({ displayName: '   ' }));
  await assert.rejects(() => service.createUser({ displayName: 'Invalid', experienceLevel: 'expert' as never }));
  await assert.rejects(() => service.updateUser(DEFAULT_LOCAL_USER_ID, {
    preferences: { defaultRestSeconds: -1 },
  }));
  await assert.rejects(() => service.updateUser(DEFAULT_LOCAL_USER_ID, {
    privacy: { profileVisibility: 'everyone' as never },
  }));
  await assert.rejects(() => service.archiveUser(DEFAULT_LOCAL_USER_ID), /default current user/i);
});

test('Profile development page uses only the User public API', async () => {
  const page = await readFile(resolve(process.cwd(), 'app/(tabs)/profile.tsx'), 'utf8');

  assert.match(page, /createUserService/);
  assert.doesNotMatch(page, /store\.users/);
});
