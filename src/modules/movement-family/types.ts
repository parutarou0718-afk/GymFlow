import type { MuscleGroup } from '../exercise';

export type MovementFamilyStatus = 'active' | 'archived';
export type FamilyRole = 'primary' | 'secondary';

export interface MovementFamily {
  id: string;
  name: string;
  aliases: string[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  category?: string | null;
  description?: string | null;
  status: MovementFamilyStatus;
  createdAt: number;
  updatedAt: number;
}

export type CreateMovementFamilyInput = Pick<MovementFamily, 'name' | 'primaryMuscles' | 'secondaryMuscles'> & Partial<Pick<MovementFamily, 'aliases' | 'category' | 'description'>>;
