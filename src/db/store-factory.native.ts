import { createStore } from './database';
import type { GymFlowStore } from './types';

export function createPlatformStore(): GymFlowStore {
  return createStore();
}
