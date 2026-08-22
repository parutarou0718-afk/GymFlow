// ========================================
// GymFlow - Store Provider & Hook
// Use useStores() in any component to access the storage layer
// ========================================

import React, { createContext, useContext, useState } from 'react';
import type { GymFlowStore } from './types';
import { createPlatformStore } from './store-factory';

const StoreContext = createContext<GymFlowStore | null>(null);

/**
 * Provides the store singleton to the component tree.
 * Wrap near your app root.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createPlatformStore);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/**
 * Access the store from any component.
 * Throws if used outside StoreProvider.
 */
export function useStores(): GymFlowStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStores() must be used within a <StoreProvider>');
  }
  return store;
}
