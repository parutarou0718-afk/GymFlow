import type { GymFlowStore } from '../../db/types';
export type InventoryStorePort = Pick<GymFlowStore, 'gyms' | 'equipment' | 'inventory'>;
