import type { GymFlowStore } from '../../db/types';

export type WorkoutStore = Pick<GymFlowStore, 'sessions' | 'templates' | 'sync' | 'events'>;
