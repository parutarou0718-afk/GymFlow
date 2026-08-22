import { generateId } from '../../lib/utils';
import type { GymFlowStore } from '../../db/types';
import type { CreateEquipmentRequirementInput, CreateRequirementGroupInput, EquipmentRequirement, ExerciseExecutionProfile, RequirementGroup, RequirementLevel } from './types';

const requirementLevels: RequirementLevel[] = ['required', 'preferred', 'optional'];

export function createExerciseEquipmentService(store: Pick<GymFlowStore, 'taxonomy' | 'exercises' | 'equipment'>) {
  return {
    async assignExerciseToMovementFamily(exerciseId: string, movementFamilyId: string, role: 'primary' | 'secondary') {
      if (!await store.exercises.get(exerciseId)) throw new Error(`Exercise not found: ${exerciseId}`);
      if (!await store.taxonomy.getFamily(movementFamilyId)) throw new Error(`Movement family not found: ${movementFamilyId}`);
      const now = Date.now();
      await store.taxonomy.assign({ id: generateId(), exerciseId, movementFamilyId, role, createdAt: now, updatedAt: now });
    },
    removeExerciseFromMovementFamily: (exerciseId: string, movementFamilyId: string) => store.taxonomy.removeAssignment(exerciseId, movementFamilyId),
    getMovementFamiliesForExercise: (exerciseId: string) => store.taxonomy.familiesForExercise(exerciseId),
    getExercisesForMovementFamily: (familyId: string) => store.taxonomy.exercisesForFamily(familyId),
    async createRequirementGroup(exerciseId: string, input: CreateRequirementGroupInput): Promise<RequirementGroup> {
      if (!await store.exercises.get(exerciseId)) throw new Error(`Exercise not found: ${exerciseId}`);
      const now = Date.now();
      const group: RequirementGroup = { id: generateId(), exerciseId, name: input.name ?? null, priority: input.priority ?? 0, createdAt: now, updatedAt: now };
      await store.taxonomy.createGroup(group);
      return group;
    },
    removeRequirementGroup: (groupId: string) => store.taxonomy.removeGroup(groupId),
    getRequirementGroupsForExercise: (exerciseId: string) => store.taxonomy.groupsForExercise(exerciseId),
    async addEquipmentRequirement(requirementGroupId: string, input: CreateEquipmentRequirementInput): Promise<EquipmentRequirement> {
      if (!requirementLevels.includes(input.level)) throw new Error(`Invalid requirement level: ${input.level}`);
      if (!await store.taxonomy.getGroup(requirementGroupId)) throw new Error(`Requirement group not found: ${requirementGroupId}`);
      const equipment = await store.equipment.get(input.equipmentId);
      if (!equipment || equipment.archived) throw new Error(`Equipment not found: ${input.equipmentId}`);
      const now = Date.now();
      const requirement: EquipmentRequirement = { id: generateId(), requirementGroupId, equipmentId: input.equipmentId, level: input.level, notes: input.notes ?? null, createdAt: now, updatedAt: now };
      await store.taxonomy.addRequirement(requirement);
      return requirement;
    },
    async updateEquipmentRequirement(id: string, patch: Partial<CreateEquipmentRequirementInput>): Promise<EquipmentRequirement> {
      const current = await store.taxonomy.getRequirement(id);
      if (!current) throw new Error(`Equipment requirement not found: ${id}`);
      if (patch.level && !requirementLevels.includes(patch.level)) throw new Error(`Invalid requirement level: ${patch.level}`);
      if (patch.equipmentId) {
        const equipment = await store.equipment.get(patch.equipmentId);
        if (!equipment || equipment.archived) throw new Error(`Equipment not found: ${patch.equipmentId}`);
      }
      const next = { ...current, ...patch, updatedAt: Date.now() };
      await store.taxonomy.updateRequirement(next);
      return next;
    },
    removeEquipmentRequirement: (id: string) => store.taxonomy.removeRequirement(id),
    getEquipmentRequirementsForGroup: (groupId: string) => store.taxonomy.requirementsForGroup(groupId),
    async getExerciseExecutionProfile(exerciseId: string): Promise<ExerciseExecutionProfile> {
      const exercise = await store.exercises.get(exerciseId);
      if (!exercise) throw new Error(`Exercise not found: ${exerciseId}`);
      const movementFamilies = await store.taxonomy.familiesForExercise(exerciseId);
      const groups = await store.taxonomy.groupsForExercise(exerciseId);
      return { exercise, movementFamilies, requirementGroups: await Promise.all(groups.map(async group => ({ ...group, requirements: await store.taxonomy.requirementsForGroup(group.id) }))) };
    },
  };
}
