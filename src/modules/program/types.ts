import type { TargetSet, TemplateExercise, WorkoutTemplate } from '../../types';

/**
 * Program is the public domain name for the persisted WorkoutTemplate shape.
 * The alias intentionally preserves the existing schema and every legacy ID.
 */
export type Program = WorkoutTemplate;
export type ProgramExercise = TemplateExercise;
export type ProgramTargetSet = TargetSet;

export type CreateProgramInput = Pick<Program, 'name' | 'description' | 'exercises'>;
