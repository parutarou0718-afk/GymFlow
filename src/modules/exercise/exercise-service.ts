import { generateId } from '../../lib/utils';
import type { ExerciseStorePort } from './ports';
import type { CreateExerciseInput, ExerciseMaster, UpdateExerciseInput } from './types';
export function createExerciseService(store: ExerciseStorePort) { return {
  async createExercise(input: CreateExerciseInput): Promise<ExerciseMaster> { const now = Date.now(); const item: ExerciseMaster = { id: generateId(), name: input.name.trim(), aliases: input.aliases ?? [], category: input.category, movementPattern: input.movementPattern, primaryMuscles: input.primaryMuscles, secondaryMuscles: input.secondaryMuscles, description: input.description ?? null, notes: input.notes ?? null, status: 'active', createdAt: now, updatedAt: now }; if (!item.name) throw new Error('Exercise name is required'); await store.exercises.create(item); return item; },
  getExercise: (id: string) => store.exercises.get(id), listExercises: () => store.exercises.list(), searchExercises: (query: string) => store.exercises.search(query),
  async updateExercise(id: string, patch: UpdateExerciseInput): Promise<ExerciseMaster> { const current = await store.exercises.get(id); if (!current || current.status === 'archived') throw new Error(`Exercise not found: ${id}`); const next = { ...current, ...patch, name: patch.name?.trim() || current.name, aliases: patch.aliases ?? current.aliases, updatedAt: Date.now() }; await store.exercises.update(next); return next; },
  async archiveExercise(id: string): Promise<ExerciseMaster> { const current = await store.exercises.get(id); if (!current) throw new Error(`Exercise not found: ${id}`); const next = { ...current, status: 'archived' as const, updatedAt: Date.now() }; await store.exercises.update(next); return next; },
}; }
