export type SubstitutionQuality = 'excellent' | 'good' | 'acceptable' | 'last_resort';
export type ExerciseSubstitutionStatus = 'active' | 'archived';
export interface ExerciseSubstitution { id: string; sourceExerciseId: string; targetExerciseId: string; quality: SubstitutionQuality; reason?: string | null; status: ExerciseSubstitutionStatus; createdAt: number; updatedAt: number; }
export type CreateSubstitutionInput = Pick<ExerciseSubstitution, 'sourceExerciseId' | 'targetExerciseId' | 'quality'> & Partial<Pick<ExerciseSubstitution, 'reason'>>;
export type UpdateSubstitutionInput = Partial<Pick<ExerciseSubstitution, 'quality' | 'reason'>>;
