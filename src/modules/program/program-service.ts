import type { ProgramStore } from './ports';
import { generateId } from '../../lib/utils';
import type { CreateProgramInput, Program } from './types';
import { createUserService } from '../user';

export interface ProgramService {
  listPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | null>;
  getProgramShareSummary(id: string): Promise<{ id: string; name: string; description: string; exerciseCount: number } | null>;
  createProgram(input: CreateProgramInput): Promise<Program>;
  copyProgram(input: { sourceProgramId: string; newOwnerUserId: string; name?: string }): Promise<Program>;
  updateProgram(program: Program): Promise<Program>;
  deleteProgram(id: string): Promise<void>;
  listProgramsForOwner(userId: string): Promise<Program[]>;
  getProgramForOwner(userId: string, id: string): Promise<Program | null>;
  createProgramForOwner(userId: string, input: CreateProgramInput): Promise<Program>;
}

export function createProgramService(store: ProgramStore): ProgramService {
  const createProgramForOwner = async (userId: string, input: CreateProgramInput): Promise<Program> => {
    const owner = await createUserService(store).getUser(userId);
    if (!owner || owner.status !== 'active') throw new Error('USER_NOT_AVAILABLE');
    const now = Date.now();
    const program: Program = { ...input, id: generateId(), createdAt: now, updatedAt: now, ownerUserId: userId };
    await store.templates.create(program);
    return program;
  };
  return {
    listPrograms: () => store.templates.getAll(),
    getProgram: id => store.templates.get(id),
    async listProgramsForOwner(userId) {
      return (await store.templates.getAll()).filter(program => program.ownerUserId === userId);
    },
    async getProgramForOwner(userId, id) {
      const program = await store.templates.get(id);
      return program?.ownerUserId === userId ? program : null;
    },
    async getProgramShareSummary(id) {
      const program = await store.templates.get(id);
      return program ? { id: program.id, name: program.name, description: program.description ?? '', exerciseCount: program.exercises.length } : null;
    },
    async createProgram(input) {
      const owner = await createUserService(store).getCurrentUser();
      return createProgramForOwner(owner.id, input);
    },
    createProgramForOwner,
    async copyProgram(input) {
      const source = await store.templates.get(input.sourceProgramId);
      if (!source) throw new Error('PROGRAM_NOT_FOUND');
      const owner = await createUserService(store).getUser(input.newOwnerUserId);
      if (!owner || owner.status !== 'active') throw new Error('USER_NOT_AVAILABLE');
      const now = Date.now();
      const copy: Program = {
        ...source,
        id: generateId(),
        ownerUserId: input.newOwnerUserId,
        name: input.name?.trim() || `${source.name} — Copy`,
        exercises: source.exercises.map(exercise => ({ ...exercise, id: generateId(), targetSets: exercise.targetSets.map(set => ({ ...set })) })),
        createdAt: now,
        updatedAt: now,
      };
      await store.templates.create(copy);
      return copy;
    },
    async updateProgram(program) {
      await store.templates.update(program);
      return program;
    },
    deleteProgram: id => store.templates.delete(id),
  };
}
