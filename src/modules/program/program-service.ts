import type { ProgramStore } from './ports';
import { generateId } from '../../lib/utils';
import type { CreateProgramInput, Program } from './types';

export interface ProgramService {
  listPrograms(): Promise<Program[]>;
  getProgram(id: string): Promise<Program | null>;
  createProgram(input: CreateProgramInput): Promise<Program>;
  updateProgram(program: Program): Promise<Program>;
  deleteProgram(id: string): Promise<void>;
}

export function createProgramService(store: ProgramStore): ProgramService {
  return {
    listPrograms: () => store.templates.getAll(),
    getProgram: id => store.templates.get(id),
    async createProgram(input) {
      const now = Date.now();
      const program: Program = {
        ...input,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
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
