import type { MatchingService } from '../matching';
import type { ProgramService } from '../program';
export interface ProgramMatchingDependencies { programs: Pick<ProgramService, 'getProgram'>; matching: Pick<MatchingService, 'matchExerciseToGym'>; }
