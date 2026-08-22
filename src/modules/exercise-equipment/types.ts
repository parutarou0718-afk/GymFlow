import type { ExerciseMaster } from '../exercise';
import type { MovementFamily } from '../movement-family';

export type RequirementLevel = 'required' | 'preferred' | 'optional';

export interface ExerciseMovementFamily {
  id: string;
  exerciseId: string;
  movementFamilyId: string;
  role: 'primary' | 'secondary';
  createdAt: number;
  updatedAt: number;
}

export interface RequirementGroup {
  id: string;
  exerciseId: string;
  name?: string | null;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface EquipmentRequirement {
  id: string;
  requirementGroupId: string;
  equipmentId: string;
  level: RequirementLevel;
  notes?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateRequirementGroupInput {
  name?: string | null;
  priority?: number;
}

export interface CreateEquipmentRequirementInput {
  equipmentId: string;
  level: RequirementLevel;
  notes?: string | null;
}

export interface ExerciseExecutionProfile {
  exercise: ExerciseMaster;
  movementFamilies: MovementFamily[];
  requirementGroups: Array<RequirementGroup & { requirements: EquipmentRequirement[] }>;
}
