import type { EquipmentRequirement, RequirementGroup } from './types';

const seededAt = new Date('2026-08-20T18:00:00.000Z').getTime();
export const requirementGroupSeeds: RequirementGroup[] = [
  { id: 'seed-group-bench-barbell', exerciseId: 'bench_press', name: 'Barbell bench setup', priority: 1, createdAt: seededAt, updatedAt: seededAt },
  { id: 'seed-group-bench-smith', exerciseId: 'bench_press', name: 'Smith machine setup', priority: 2, createdAt: seededAt, updatedAt: seededAt },
  { id: 'seed-group-squat-rack', exerciseId: 'squat', name: 'Rack setup', priority: 1, createdAt: seededAt, updatedAt: seededAt },
  { id: 'seed-group-pulldown', exerciseId: 'lat_pulldown', name: 'Lat pulldown machine', priority: 1, createdAt: seededAt, updatedAt: seededAt },
];
export const equipmentRequirementSeeds: EquipmentRequirement[] = [
  { id: 'seed-requirement-bench-barbell', requirementGroupId: 'seed-group-bench-barbell', equipmentId: 'web-equipment-1', level: 'required', createdAt: seededAt, updatedAt: seededAt },
  { id: 'seed-requirement-bench-bench', requirementGroupId: 'seed-group-bench-barbell', equipmentId: 'web-equipment-3', level: 'required', createdAt: seededAt, updatedAt: seededAt },
  { id: 'seed-requirement-bench-rack', requirementGroupId: 'seed-group-bench-barbell', equipmentId: 'web-equipment-5', level: 'preferred', createdAt: seededAt, updatedAt: seededAt },
  { id: 'seed-requirement-bench-smith', requirementGroupId: 'seed-group-bench-smith', equipmentId: 'web-equipment-7', level: 'required', createdAt: seededAt, updatedAt: seededAt },
  { id: 'seed-requirement-squat-rack', requirementGroupId: 'seed-group-squat-rack', equipmentId: 'web-equipment-5', level: 'required', createdAt: seededAt, updatedAt: seededAt },
  { id: 'seed-requirement-pulldown', requirementGroupId: 'seed-group-pulldown', equipmentId: 'web-equipment-19', level: 'required', createdAt: seededAt, updatedAt: seededAt },
];
