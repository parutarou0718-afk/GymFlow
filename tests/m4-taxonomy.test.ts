import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createMovementFamilyService } from '../src/modules/movement-family';
import { createExerciseEquipmentService } from '../src/modules/exercise-equipment';
import { exerciseSeeds } from '../src/modules/exercise/seed';
import { movementFamilySeeds } from '../src/modules/movement-family/seed';

test('M4 seed exposes the PRD family identifiers and maps every seeded exercise', async () => {
  const expectedIds = ['horizontal_press', 'incline_press', 'vertical_press', 'fly', 'lateral_raise', 'rear_delt_fly', 'vertical_pull', 'horizontal_row', 'high_row', 'squat', 'leg_press', 'hip_hinge', 'hip_extension', 'knee_extension', 'knee_flexion', 'hip_abduction', 'hip_adduction', 'calf_raise', 'elbow_flexion', 'elbow_extension', 'core_flexion', 'core_stability'];
  assert.deepEqual(movementFamilySeeds.map(item => item.id), expectedIds);
  const api = createExerciseEquipmentService(createWebStore());
  for (const exercise of exerciseSeeds) assert.ok((await api.getMovementFamiliesForExercise(exercise.id)).length > 0, `${exercise.id} has a family`);
  assert.equal((await api.getRequirementGroupsForExercise('push_up')).length, 0);
  assert.equal((await api.getRequirementGroupsForExercise('plank')).length, 0);
  const bench = await api.getExerciseExecutionProfile('bench_press');
  const barbellSetup = bench.requirementGroups.find(group => group.id === 'seed-group-bench-barbell');
  assert.deepEqual(barbellSetup?.requirements.map(item => [item.equipmentId, item.level]), [['web-equipment-1', 'required'], ['web-equipment-3', 'required'], ['web-equipment-5', 'preferred']]);
});

test('M4 taxonomy keeps family assignments and OR groups with AND requirements', async () => {
  const store = createWebStore(); const families = createMovementFamilyService(store); const execution = createExerciseEquipmentService(store);
  const family = await families.createMovementFamily({ name: 'Horizontal Press', aliases: ['卧推类'], primaryMuscles: ['chest'], secondaryMuscles: ['triceps'] });
  await execution.assignExerciseToMovementFamily('bench_press', family.id, 'primary');
  const groupA = await execution.createRequirementGroup('bench_press', { name: 'Barbell setup', priority: 1 });
  const groupB = await execution.createRequirementGroup('bench_press', { name: 'Alternative setup', priority: 2 });
  await execution.addEquipmentRequirement(groupA.id, { equipmentId: 'web-equipment-1', level: 'required' });
  await execution.addEquipmentRequirement(groupA.id, { equipmentId: 'web-equipment-3', level: 'preferred' });
  await execution.addEquipmentRequirement(groupB.id, { equipmentId: 'web-equipment-7', level: 'optional' });
  const profile = await execution.getExerciseExecutionProfile('bench_press');
  assert.ok(profile.movementFamilies.some(item => item.id === family.id));
  assert.equal(profile.movementFamilyAssignments.find(item => item.movementFamilyId === family.id)?.role, 'primary');
  assert.ok(profile.requirementGroups.some(item => item.id === groupA.id && item.requirements.length === 2));
  assert.ok(profile.requirementGroups.some(item => item.id === groupB.id && item.requirements.length === 1));
  await assert.rejects(() => execution.addEquipmentRequirement(groupA.id, { equipmentId: 'missing', level: 'required' }));
  await execution.assignExerciseToMovementFamily('bench_press', family.id, 'secondary');
  await execution.updateEquipmentRequirement((await execution.getEquipmentRequirementsForGroup(groupA.id))[0].id, { level: 'optional' });
  await execution.removeEquipmentRequirement((await execution.getEquipmentRequirementsForGroup(groupB.id))[0].id);
  await execution.removeRequirementGroup(groupB.id);
  await execution.removeExerciseFromMovementFamily('bench_press', family.id);
  const reloaded = await execution.getExerciseExecutionProfile('bench_press');
  assert.equal(reloaded.movementFamilyAssignments.some(item => item.movementFamilyId === family.id), false);
  assert.equal(reloaded.requirementGroups.some(item => item.id === groupB.id), false);
  assert.equal((await execution.getEquipmentRequirementsForGroup(groupA.id))[0].level, 'optional');
});
