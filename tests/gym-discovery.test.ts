import assert from 'node:assert/strict';
import test from 'node:test';
import { createGymDiscoveryService, unavailableExternalGymProvider } from '../src/modules/gym-discovery';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';

test('Gym Discovery distinguishes an unconfigured provider from an empty search', async () => {
  const service = createGymDiscoveryService({ provider: unavailableExternalGymProvider });
  assert.equal((await service.searchExternalGyms({ query: 'gym' })).status, 'not_configured');
});

test('Link rejects an external reference already bound to another Gym', async () => {
  const gymApi = createGymService(createWebStore()); const a = await gymApi.createGym({ name: 'A' }); const b = await gymApi.createGym({ name: 'B' });
  const links = new Map<string, any>(); const service = createGymDiscoveryService({ provider: unavailableExternalGymProvider, gymService: gymApi, links: { get: async (p, id) => links.get(`${p}:${id}`) ?? null, create: async link => { links.set(`${link.provider}:${link.externalPlaceId}`, link); } } });
  await service.linkExternalGym(a.id, { provider: 'osm', externalPlaceId: '1' });
  await assert.rejects(() => service.linkExternalGym(b.id, { provider: 'osm', externalPlaceId: '1' }), /already linked/);
});

test('Import is idempotent and writes Gym with its link together', async () => {
  const store = createWebStore(); const gyms = createGymService(store); const service = createGymDiscoveryService({ provider: unavailableExternalGymProvider, gymService: gyms, links: store.gymExternalLinks, importer: store.gymDiscoveryImport });
  const result = { provider: 'osm', externalPlaceId: '99', name: 'External Gym', latitude: 35, longitude: 139 };
  const first = await service.importExternalGym(result); const second = await service.importExternalGym(result);
  assert.equal(first.id, second?.id); assert.equal((await store.gymExternalLinks.get('osm', '99'))?.gymId, first.id);
});
