import type { GymFlowStore } from '../../db/types';

export type GymContextStorePort = Pick<GymFlowStore, 'gymContexts' | 'users' | 'gyms'>;
