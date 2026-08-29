import type { CreateProgramInput, Program, ProgramService } from '../program';
import type { ProgramGymMatchResult } from '../program-matching';
export interface AdaptationDecision { programExerciseId: string; replacementExerciseId: string; }
export interface CreateAdaptedProgramInput { programId: string; matchResult: ProgramGymMatchResult; name?: string; decisions?: AdaptationDecision[]; }
export interface ProgramAdaptationDependencies { programs: Pick<ProgramService, 'getProgram' | 'createProgram'>; gyms: { getGym(id: string): Promise<{ id: string; name: string } | null> }; }
export interface ProgramAdaptationService { createAdaptedProgram(input: CreateAdaptedProgramInput): Promise<Program>; }
export type { CreateProgramInput };
