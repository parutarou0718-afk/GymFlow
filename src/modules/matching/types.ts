import type { CandidateReasonCode, CandidateSource } from '../candidate-resolution';
export type ExerciseGymCompatibilityStatus = 'executable' | 'executable_with_warning' | 'not_executable';
export type CompatibilityIssueCode = 'missing_required_equipment' | 'missing_preferred_equipment' | 'equipment_unavailable' | 'equipment_availability_unknown' | 'insufficient_capability' | 'unknown_capability';
export interface CompatibilityIssue { code: CompatibilityIssueCode; equipmentId?: string; requirementId?: string; capabilityKey?: string; requiredValue?: number; availableValue?: number; unit?: string; }
export interface EquipmentCapabilityDemand { equipmentId?: string; capabilityKey: 'maxWeightKg' | 'maxResistanceKg'; requiredValue: number; unit: string; }
export interface ExerciseMatchContext { equipmentDemands?: EquipmentCapabilityDemand[]; }
export interface MatchExerciseToGymInput { exerciseId: string; gymId: string; context?: ExerciseMatchContext; includeAlternatives?: boolean; alternativeLimit?: number; }
export interface EquipmentRequirementEvaluation { requirementId: string; equipmentId: string; level: 'required' | 'preferred' | 'optional'; satisfied: boolean; issues: CompatibilityIssue[]; }
export interface RequirementGroupEvaluation { groupId: string; status: ExerciseGymCompatibilityStatus; requirements: EquipmentRequirementEvaluation[]; issues: CompatibilityIssue[]; }
export interface GymAwareExerciseAlternative { exerciseId: string; compatibilityStatus: ExerciseGymCompatibilityStatus; candidateScore: number; candidateSources: CandidateSource[]; candidateReasons: CandidateReasonCode[]; selectedRequirementGroupId?: string | null; issues: CompatibilityIssue[]; }
export interface ExerciseGymMatchResult { exerciseId: string; gymId: string; status: ExerciseGymCompatibilityStatus; selectedRequirementGroupId?: string | null; groupEvaluations: RequirementGroupEvaluation[]; issues: CompatibilityIssue[]; alternatives: GymAwareExerciseAlternative[]; }
