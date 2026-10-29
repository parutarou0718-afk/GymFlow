import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';
import { createGymContextService } from '../src/modules/gym-context';
import { DEFAULT_LOCAL_USER_ID } from '../src/modules/user';
import { createUserGymService } from '../src/modules/user-gym';

test('M21 Home presents Gym-aware training context and keeps a no-Gym path', async () => {
  const source = await readFile(resolve(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

  assert.match(source, /Today at/);
  assert.match(source, /Choose where you.{0,2}re training/);
  assert.match(source, /Change training location/);
  assert.match(source, /Choose a Program/);
  assert.doesNotMatch(source, /Gym: \$\{activeSession\.gymId\}/);
  assert.doesNotMatch(source, /store\.(sessions|templates|gyms|userGyms)/);
});

test('M21 Current Gym is a location-selection screen using public APIs', async () => {
  const source = await readFile(resolve(process.cwd(), 'app/(tabs)/current-gym.tsx'), 'utf8');

  assert.match(source, /Choose where you.{0,2}re training/);
  assert.match(source, /Equipment data (available|is limited)/);
  assert.doesNotMatch(source, /Development validation/);
  assert.doesNotMatch(source, /store\.(sessions|templates|gyms|userGyms|inventory)/);
});

test('M21 Current Gym selection preserves Home, Favorite, Visit, and Membership state', async () => {
  const store = createWebStore();
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const userGyms = createUserGymService(store);
  const [home, favorite, selected] = await Promise.all([
    gyms.createGym({ name: 'Home Gym' }),
    gyms.createGym({ name: 'Favorite Gym' }),
    gyms.createGym({ name: 'Selected Gym' }),
  ]);

  await userGyms.setHomeGym(DEFAULT_LOCAL_USER_ID, home.id);
  await userGyms.setFavorite(DEFAULT_LOCAL_USER_ID, favorite.id, true);
  await userGyms.recordGymVisit(DEFAULT_LOCAL_USER_ID, favorite.id, 1234);
  await userGyms.setMembership(DEFAULT_LOCAL_USER_ID, favorite.id, { status: 'active', startedAt: 1000 });
  const before = await userGyms.listUserGyms(DEFAULT_LOCAL_USER_ID);

  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, selected.id);

  assert.equal(await contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID), selected.id);
  assert.deepEqual(await userGyms.listUserGyms(DEFAULT_LOCAL_USER_ID), before);
});

test('M21 Home treats a closed stored Current Gym as unavailable without mutating related state', async () => {
  const source = await readFile(resolve(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');
  const store = createWebStore();
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const userGyms = createUserGymService(store);
  const gym = await gyms.createGym({ name: 'Closing Gym' });
  await userGyms.setHomeGym(DEFAULT_LOCAL_USER_ID, gym.id);
  await userGyms.setFavorite(DEFAULT_LOCAL_USER_ID, gym.id, true);
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gym.id);
  await gyms.archiveGym(gym.id);
  const beforeRelationships = await userGyms.listUserGyms(DEFAULT_LOCAL_USER_ID);

  const resolved = await gyms.getGym(await contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID) ?? '');
  const homeCurrentGym = resolved?.status === 'active' ? resolved : null;

  assert.equal(homeCurrentGym, null);
  assert.equal(await contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID), gym.id);
  assert.deepEqual(await userGyms.listUserGyms(DEFAULT_LOCAL_USER_ID), beforeRelationships);
  assert.match(source, /availableCurrentGym = resolvedCurrentGym\?\.status === 'active' \? resolvedCurrentGym : null/);
});
