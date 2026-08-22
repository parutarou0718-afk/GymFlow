import { generateId } from '../../lib/utils';
import type { GymFlowStore } from '../../db/types';
import type { CreateSubstitutionInput, ExerciseSubstitution, UpdateSubstitutionInput } from './types';
export function createExerciseSubstitutionService(store: Pick<GymFlowStore, 'substitutions' | 'exercises'>) { return {
  async createSubstitution(input: CreateSubstitutionInput): Promise<ExerciseSubstitution> { if (input.sourceExerciseId === input.targetExerciseId) throw new Error('Source and target exercises must differ'); const [source, target] = await Promise.all([store.exercises.get(input.sourceExerciseId), store.exercises.get(input.targetExerciseId)]); if (!source || !target) throw new Error('Source and target exercises must exist'); const now = Date.now(); const item: ExerciseSubstitution = { id: generateId(), ...input, reason: input.reason ?? null, status: 'active', createdAt: now, updatedAt: now }; await store.substitutions.create(item); return item; },
  getSubstitution: (id: string) => store.substitutions.get(id), listSubstitutionsForSource: (id: string) => store.substitutions.listForSource(id), listSubstitutionsToTarget: (id: string) => store.substitutions.listToTarget(id),
  async updateSubstitution(id: string, patch: UpdateSubstitutionInput) { const current = await store.substitutions.get(id); if (!current) throw new Error(`Substitution not found: ${id}`); const next = { ...current, ...patch, updatedAt: Date.now() }; await store.substitutions.update(next); return next; },
  async archiveSubstitution(id: string) { return this.updateSubstitution(id, {}).then(async item => { const next = { ...item, status: 'archived' as const, updatedAt: Date.now() }; await store.substitutions.update(next); return next; }); },
}; }
