import { generateId } from '../../lib/utils';
import type { GymFlowStore } from '../../db/types';
import type { CreateMovementFamilyInput, MovementFamily } from './types';

export function createMovementFamilyService(store: Pick<GymFlowStore, 'taxonomy'>) {
  return {
    async createMovementFamily(input: CreateMovementFamilyInput): Promise<MovementFamily> {
      if (!input.name.trim()) throw new Error('Movement family name is required');
      const now = Date.now();
      const family: MovementFamily = { id: generateId(), name: input.name.trim(), aliases: input.aliases ?? [], primaryMuscles: input.primaryMuscles, secondaryMuscles: input.secondaryMuscles, category: input.category ?? null, description: input.description ?? null, status: 'active', createdAt: now, updatedAt: now };
      await store.taxonomy.createFamily(family);
      return family;
    },
    getMovementFamily: (id: string) => store.taxonomy.getFamily(id),
    listMovementFamilies: () => store.taxonomy.listFamilies(),
    searchMovementFamilies: (query: string) => store.taxonomy.searchFamilies(query),
    async updateMovementFamily(id: string, patch: Partial<CreateMovementFamilyInput>): Promise<MovementFamily> {
      const current = await store.taxonomy.getFamily(id);
      if (!current || current.status === 'archived') throw new Error(`Movement family not found: ${id}`);
      const next = { ...current, ...patch, name: patch.name?.trim() || current.name, aliases: patch.aliases ?? current.aliases, updatedAt: Date.now() };
      await store.taxonomy.updateFamily(next);
      return next;
    },
    async archiveMovementFamily(id: string): Promise<MovementFamily> {
      const current = await store.taxonomy.getFamily(id);
      if (!current) throw new Error(`Movement family not found: ${id}`);
      const next = { ...current, status: 'archived' as const, updatedAt: Date.now() };
      await store.taxonomy.updateFamily(next);
      return next;
    },
    getMovementFamiliesForMuscle: (muscle: string) => store.taxonomy.familiesForMuscle(muscle),
    async getExerciseTreeForMuscle(muscle: string) {
      const families = await store.taxonomy.familiesForMuscle(muscle);
      return Promise.all(families.map(async family => ({ family, exercises: await store.taxonomy.exercisesForFamily(family.id) })));
    },
  };
}
