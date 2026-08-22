import { Platform } from 'react-native';
import type { GymFlowStore } from './types';

export function createPlatformStore(): GymFlowStore {
  if (Platform.OS === 'web') {
    const { createWebStore } = require('./web-store') as typeof import('./web-store');
    return createWebStore();
  }

  const { createStore } = require('./database') as typeof import('./database');
  return createStore();
}
