import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymDataImportService, type GymImportData } from '../src/modules/gym-data-import';
import { createGymService } from '../src/modules/gym';

const data: GymImportData = {
  schemaVersion: 1,
  source: { name: 'operator_verified', reference: 'survey-2026-09-01', verifiedAt: '2026-09-01T00:00:00Z' },
  gyms: [{ operatorGymKey: 'sample-osaka-001', name: 'Sample Osaka Gym', status: 'active', inventory: [{ equipmentId: 'web-equipment-7', quantity: 2, status: 'available', verified: true, verifiedAt: '2026-09-01T00:00:00Z' }] }],
};

test('validated import plans and applies a canonical Gym dataset idempotently', async () => {
  const store = createWebStore();
  const importer = createGymDataImportService(store);
  const plan = await importer.plan(data);
  assert.deepEqual(plan.summary, { gymsToCreate: 1, gymsToUpdate: 0, inventoryToCreate: 1, inventoryToUpdate: 0, unchanged: 0, warnings: [] });
  await importer.apply(plan);
  const repeat = await importer.plan(data);
  assert.equal(repeat.summary.gymsToCreate, 0);
  assert.equal(repeat.summary.inventoryToCreate, 0);
  assert.equal(repeat.summary.gymsToUpdate, 0);
  assert.equal(repeat.summary.inventoryToUpdate, 0);
});

test('invalid imported Equipment produces zero writes', async () => {
  const store = createWebStore();
  const importer = createGymDataImportService(store);
  await assert.rejects(() => importer.plan({ ...data, gyms: [{ ...data.gyms[0], inventory: [{ ...data.gyms[0].inventory[0], equipmentId: 'unknown' }] }] }), /Unknown canonical Equipment ID/);
  assert.equal((await store.gyms.list()).some(gym => gym.name === 'Sample Osaka Gym'), false);
});

test('correction updates one logical inventory record and omission is non-destructive', async () => {
  const store = createWebStore(); const importer = createGymDataImportService(store);
  await importer.apply(await importer.plan(data));
  const corrected: GymImportData = { ...data, gyms: [{ ...data.gyms[0], inventory: [{ ...data.gyms[0].inventory[0], quantity: 3 }] }] };
  await importer.apply(await importer.plan(corrected));
  const gym = (await store.gyms.list()).find(item => item.operatorGymKey === 'sample-osaka-001')!;
  assert.equal((await store.inventory.listByGym(gym.id))[0].quantity, 3);
  await importer.apply(await importer.plan({ ...corrected, gyms: [{ ...corrected.gyms[0], inventory: [] }] }));
  assert.equal((await store.inventory.listByGym(gym.id)).length, 1);
});

test('duplicate rows and conflicting Gym identities fail before mutation', async () => {
  const store = createWebStore(); const importer = createGymDataImportService(store);
  await assert.rejects(() => importer.plan({ ...data, gyms: [{ ...data.gyms[0], inventory: [data.gyms[0].inventory[0], data.gyms[0].inventory[0]] }] }), /duplicate equipmentId/);
  const gyms = createGymService(store);
  await gyms.createGym({ name: 'Key Gym', operatorGymKey: 'key-a' });
  await gyms.createGym({ name: 'External Gym', externalProvider: 'osm', externalPlaceId: 'x' });
  await assert.rejects(() => importer.plan({ ...data, gyms: [{ ...data.gyms[0], operatorGymKey: 'key-a', externalProvider: 'osm', externalPlaceId: 'x' }] }), /Conflicting Gym identities/);
});
