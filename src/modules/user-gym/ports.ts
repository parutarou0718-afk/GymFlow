import type { GymFlowStore } from '../../db/types';
export type UserGymStorePort = Pick<GymFlowStore, 'userGyms' | 'users' | 'gyms'>;
