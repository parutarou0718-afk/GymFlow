import type { GymFlowStore } from '../../db/types';

/** Storage capability required by the Program domain. */
export type ProgramStore = Pick<GymFlowStore, 'templates'>;
