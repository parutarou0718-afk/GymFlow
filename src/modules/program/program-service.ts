import type { ProgramStore } from './ports';
import { generateId } from '../../lib/utils';
import type { CreateProgramInput, Program } from './types';
import { createUserService } from '../user';

export interface ProgramService {
  listPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | null>;
  getProgramShareSummary(id: string): Promise<{ id: string; name: string; description: string; exerciseCount: number } | null>;
  createProgram(input: CreateProgramInput): Promise<Program>;
  updateProgram(program: Program): Promise<Program>;
  deleteProgram(id: string): Promise<void>;
}

export function createProgramService(store: ProgramStore): ProgramService {
  return {
    listPrograms: () => store.templates.getAll(),
    getProgram: id => store.templates.get(id),
    async getProgramShareSummary(id) {
      const program = await store.templates.get(id);
      return program ? { id: program.id, name: program.name, description: program.description ?? '', exerciseCount: program.exercises.length } : null;
    },
    async createProgram(input) {
      const now = Date.now();
      const owner = await createUserService(store).getCurrentUser();
      const program: Program = {
        ...input,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        ownerUserId: owner.id,
      };
      await store.templates.create(program);
      return program;
    },
    async updateProgram(program) {
      await store.templates.update(program);
      return program;
    },
    deleteProgram: id => store.templates.delete(id),
  };
}
