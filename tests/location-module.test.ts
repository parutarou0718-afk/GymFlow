import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';
import { createLocationService, unavailableLocationProvider } from '../src/modules/location';

test('Location calculates Haversine distance and reports an unconfigured default provider', async () => {
  const gyms = createGymService(createWebStore());
  const location = createLocationService({ gymService: gyms, locationProvider: unavailableLocationProvider });
  assert.equal((await location.getCurrentLocation()).status, 'not_configured');
  assert.equal(location.calculateDistance({ latitude: 35.0, longitude: 139.0 }, { latitude: 35.0, longitude: 139.0 }), 0);
});

test('Location returns sorted nearby active gyms and excludes closed or unlocated gyms', async () => {
  const gyms = createGymService(createWebStore());
  const near = await gyms.createGym({ name: 'Near', latitude: 35, longitude: 139 });
  const far = await gyms.createGym({ name: 'Far', latitude: 36, longitude: 139 });
  const closed = await gyms.createGym({ name: 'Closed', latitude: 35.01, longitude: 139.01 });
  await gyms.archiveGym(closed.id);
  await gyms.createGym({ name: 'Unknown' });
  const location = createLocationService({ gymService: gyms, locationProvider: { getCurrentLocation: async () => ({ status: 'available', location: { latitude: 35, longitude: 139 } }) } });
  const result = await location.listNearbyGyms({ limit: 2 });
  assert.equal(result.status, 'available');
  if (result.status === 'available') assert.deepEqual(result.gyms.map(item => item.gym.id), [near.id, far.id]);
});

test('Location reports a Gym without coordinates as unavailable', async () => {
  const gyms = createGymService(createWebStore());
  const gym = await gyms.createGym({ name: 'No location' });
  const location = createLocationService({ gymService: gyms, locationProvider: unavailableLocationProvider });
  assert.deepEqual(await location.getDistanceToGym(gym.id, { latitude: 35, longitude: 139 }), { status: 'gym_location_unavailable' });
});
