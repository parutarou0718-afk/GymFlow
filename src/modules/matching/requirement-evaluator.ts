import type { ExerciseGymCompatibilityStatus } from './types';
export function compatibilityStatus(blockingIssueCount: number, warningIssueCount: number): ExerciseGymCompatibilityStatus { return blockingIssueCount > 0 ? 'not_executable' : warningIssueCount > 0 ? 'executable_with_warning' : 'executable'; }
