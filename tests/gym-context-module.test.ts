import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';
import { createGymContextService } from '../src/modules/gym-context';
import { DEFAULT_LOCAL_USER_ID } from '../src/modules/user';

test('Gym Context persists the selected current gym without changing user-gym relationships', async () => {
  const store = createWebStore();
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const gym = await gyms.createGym({ name: 'Current Gym' });

  assert.equal((await contexts.getGymContext(DEFAULT_LOCAL_USER_ID)).currentGymId, null);
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gym.id);
  assert.equal(await contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID), gym.id);
  assert.equal(await store.userGyms.get(DEFAULT_LOCAL_USER_ID, gym.id), null);

  await contexts.clearCurrentGym(DEFAULT_LOCAL_USER_ID);
  assert.equal(await contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID), null);
});

test('Gym Context rejects closed gyms without silently clearing an existing selection', async () => {
  const store = createWebStore();
  const gyms = createGymService(store);
  const contexts = createGymContextService(store);
  const openGym = await gyms.createGym({ name: 'Open Gym' });
  const closedGym = await gyms.createGym({ name: 'Closed Gym' });
  await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, openGym.id);
  await gyms.archiveGym(closedGym.id);

  await assert.rejects(() => contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, closedGym.id), /closed gym/i);
  assert.equal(await contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID), openGym.id);
});
