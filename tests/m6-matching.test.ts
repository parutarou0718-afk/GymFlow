import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createMatchingService } from '../src/modules/matching';

test('M6 evaluates required, preferred, and bodyweight execution against a gym', async () => {
  const store = createWebStore();
  await store.gyms.create({ id: 'm6-gym', name: 'M6 Gym', status: 'active', createdAt: 1, updatedAt: 1 });
  await store.inventory.create({ id: 'm6-barbell', gymId: 'm6-gym', equipmentId: 'web-equipment-1', quantity: 1, status: 'available', verified: true, createdAt: 1, updatedAt: 1 });
  await store.inventory.create({ id: 'm6-bench', gymId: 'm6-gym', equipmentId: 'web-equipment-3', quantity: 1, status: 'available', verified: true, createdAt: 1, updatedAt: 1 });
  const matching = createMatchingService(store);
  const bench = await matching.matchExerciseToGym({ exerciseId: 'bench_press', gymId: 'm6-gym' });
  assert.equal(bench.status, 'executable_with_warning');
  assert.ok(bench.issues.some(issue => issue.code === 'missing_preferred_equipment'));
  const plank = await matching.matchExerciseToGym({ exerciseId: 'plank', gymId: 'm6-gym' });
  assert.equal(plank.status, 'executable');
  await store.inventory.create({ id: 'm6-dumbbell', gymId: 'm6-gym', equipmentId: 'web-equipment-2', quantity: 1, status: 'available', verified: true, capabilities: { maxWeightKg: 40 }, createdAt: 1, updatedAt: 1 });
  const capability = await matching.matchExerciseToGym({ exerciseId: 'bench_press', gymId: 'm6-gym', context: { equipmentDemands: [{ equipmentId: 'web-equipment-1', capabilityKey: 'maxWeightKg', requiredValue: 50, unit: 'kg' }] } });
  assert.equal(capability.status, 'executable_with_warning');
  assert.ok(capability.issues.some(issue => issue.code === 'unknown_capability'));
});
