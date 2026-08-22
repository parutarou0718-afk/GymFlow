import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createGymService } from '../src/modules/gym';
import { createEquipmentService } from '../src/modules/equipment';
import { createInventoryService } from '../src/modules/gym-inventory';

test('M2 services create, search, archive, and reuse Equipment across Gym inventories', async () => {
  const store = createWebStore();
  const gyms = createGymService(store);
  const equipment = createEquipmentService(store);
  const inventory = createInventoryService(store);

  const gymA = await gyms.createGym({ name: 'North Fitness', branchName: 'Central' });
  const gymB = await gyms.createGym({ name: 'South Fitness' });
  const hackSquat = await equipment.createEquipment({ name: 'Hack Squat', category: 'machine', aliases: ['哈克深蹲', '哈克机'] });

  assert.equal((await gyms.getGym(gymA.id))?.branchName, 'Central');
  assert.equal((await gyms.updateGym(gymA.id, { address: '1 Main Street' })).address, '1 Main Street');
  assert.ok((await equipment.searchEquipment('哈克')).some(item => item.id === hackSquat.id));
  assert.equal((await equipment.updateEquipment(hackSquat.id, { aliases: ['Hack', '哈克机'] })).aliases[0], 'Hack');
  const first = await inventory.addEquipmentToGym(gymA.id, hackSquat.id, { quantity: 1 });
  await inventory.addEquipmentToGym(gymB.id, hackSquat.id, { quantity: 2 });
  await inventory.updateGymEquipment(first.id, { quantity: 3, area: '力量区', verified: true });

  assert.equal((await inventory.getGymEquipment(gymA.id))[0].quantity, 3);
  assert.equal((await inventory.getGymEquipment(gymB.id))[0].equipmentId, hackSquat.id);
  await assert.rejects(() => inventory.addEquipmentToGym('missing-gym', hackSquat.id, { quantity: 1 }));
  await inventory.removeEquipmentFromGym(gymB.id, hackSquat.id);
  assert.equal(await inventory.hasEquipment(gymB.id, hackSquat.id), false);

  const archived = await equipment.archiveEquipment(hackSquat.id);
  assert.equal(archived.archived, true);
  assert.equal(await equipment.getEquipment(hackSquat.id), null);
  assert.equal((await gyms.archiveGym(gymA.id)).status, 'closed');
});
