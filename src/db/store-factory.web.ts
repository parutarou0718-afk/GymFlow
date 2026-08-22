import { createWebStore } from './web-store';
import type { GymFlowStore } from './types';

export function createPlatformStore(): GymFlowStore {
  return createWebStore();
}
