import type { ProgramExerciseMatchResult, ProgramGymMatchStatus, ProgramGymMatchSummary } from './types';
export function summarizeProgramMatches(exercises: ProgramExerciseMatchResult[]): ProgramGymMatchSummary {
  const summary: ProgramGymMatchSummary = { totalExercises: exercises.length, executable: 0, executableWithWarning: 0, notExecutable: 0, replaceable: 0, unresolved: 0 };
  for (const item of exercises) { if (item.match.status === 'executable') summary.executable++; else if (item.match.status === 'executable_with_warning') summary.executableWithWarning++; else { summary.notExecutable++; if (item.recommendedAlternativeExerciseId) summary.replaceable++; else summary.unresolved++; } }
  return summary;
}
export function deriveProgramMatchStatus(summary: ProgramGymMatchSummary): ProgramGymMatchStatus { if (summary.unresolved > 0) return 'not_executable'; if (summary.replaceable > 0) return 'requires_adaptation'; if (summary.executableWithWarning > 0) return 'executable_with_warnings'; return 'fully_executable'; }
