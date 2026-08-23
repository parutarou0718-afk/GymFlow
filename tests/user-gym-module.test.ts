import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';
import { DEFAULT_LOCAL_USER_ID } from '../src/modules/user';
import { createUserGymService } from '../src/modules/user-gym';

async function setup() {
  const store = createWebStore();
  const gyms = createGymService(store);
  const api = createUserGymService(store);
  const [a, b, c] = await Promise.all(['Gym A', 'Gym B', 'Gym C'].map(name => gyms.createGym({ name })));
  return { api, gyms, a, b, c };
}

test('M11 keeps one Home Gym while preserving other labels', async () => {
  const { api, a, b } = await setup();
  await api.setFavorite(DEFAULT_LOCAL_USER_ID, a.id, true);
  await api.setHomeGym(DEFAULT_LOCAL_USER_ID, a.id);
  await api.setHomeGym(DEFAULT_LOCAL_USER_ID, b.id);
  assert.equal((await api.getHomeGym(DEFAULT_LOCAL_USER_ID))?.gymId, b.id);
  assert.equal((await api.getUserGymRelationship(DEFAULT_LOCAL_USER_ID, a.id))?.isHome, false);
  assert.equal((await api.getUserGymRelationship(DEFAULT_LOCAL_USER_ID, a.id))?.isFavorite, true);
  await api.clearHomeGym(DEFAULT_LOCAL_USER_ID);
  assert.equal(await api.getHomeGym(DEFAULT_LOCAL_USER_ID), null);
});

test('M11 tracks multiple favorites, monotonic visits, deterministic recent gyms, and membership', async () => {
  const { api, a, b, c } = await setup();
  await api.setFavorite(DEFAULT_LOCAL_USER_ID, a.id, true);
  await api.setFavorite(DEFAULT_LOCAL_USER_ID, b.id, true);
  await api.recordGymVisit(DEFAULT_LOCAL_USER_ID, a.id, 200);
  await api.recordGymVisit(DEFAULT_LOCAL_USER_ID, a.id, 100);
  await api.recordGymVisit(DEFAULT_LOCAL_USER_ID, b.id, 300);
  await api.recordGymVisit(DEFAULT_LOCAL_USER_ID, c.id, 300);
  await api.setMembership(DEFAULT_LOCAL_USER_ID, a.id, { status: 'active', startedAt: 10, expiresAt: 20 });
  assert.equal((await api.getUserGymRelationship(DEFAULT_LOCAL_USER_ID, a.id))?.lastVisitedAt, 200);
  assert.deepEqual((await api.getRecentGyms(DEFAULT_LOCAL_USER_ID, { limit: 2 })).map(item => item.gymId), [b.id, c.id].sort());
  assert.equal((await api.getUserGymRelationship(DEFAULT_LOCAL_USER_ID, a.id))?.membershipStatus, 'active');
  await api.clearMembership(DEFAULT_LOCAL_USER_ID, a.id);
  assert.equal((await api.getUserGymRelationship(DEFAULT_LOCAL_USER_ID, a.id))?.isFavorite, true);
  await assert.rejects(() => api.setMembership(DEFAULT_LOCAL_USER_ID, a.id, { status: 'active', startedAt: 20, expiresAt: 10 }));
});

test('M11 cleans empty relationships and rejects invalid entities', async () => {
  const { api, gyms, a } = await setup();
  await api.setFavorite(DEFAULT_LOCAL_USER_ID, a.id, true);
  await api.setFavorite(DEFAULT_LOCAL_USER_ID, a.id, false);
  assert.equal(await api.getUserGymRelationship(DEFAULT_LOCAL_USER_ID, a.id), null);
  await api.recordGymVisit(DEFAULT_LOCAL_USER_ID, a.id, 1);
  await api.setFavorite(DEFAULT_LOCAL_USER_ID, a.id, false);
  assert.ok(await api.getUserGymRelationship(DEFAULT_LOCAL_USER_ID, a.id));
  await assert.rejects(() => api.setFavorite('missing-user', a.id, true), /User not found/);
  await assert.rejects(() => api.setFavorite(DEFAULT_LOCAL_USER_ID, 'missing-gym', true), /Gym not found/);
  await gyms.archiveGym(a.id);
  await assert.rejects(() => api.setHomeGym(DEFAULT_LOCAL_USER_ID, a.id), /closed gym/i);
  await assert.rejects(() => api.recordGymVisit(DEFAULT_LOCAL_USER_ID, a.id), /closed gym/i);
});

test('M11 validation page uses only User, Gym, and User–Gym public APIs', async () => {
  const page = await readFile(resolve(process.cwd(), 'app/(tabs)/user-gyms.tsx'), 'utf8');
  assert.match(page, /createUserService/);
  assert.match(page, /createGymService/);
  assert.match(page, /createUserGymService/);
  assert.doesNotMatch(page, /store\.users|store\.gyms|store\.userGyms/);
});
