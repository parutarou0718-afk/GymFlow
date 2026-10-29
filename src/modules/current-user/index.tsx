import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStores } from '../../db/stores';
import { getAuthClient } from '../auth-client';
import { createUserService, type UserProfile } from '../user';

export type CurrentUserState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: UserProfile }
  | { status: 'logged-out'; user: null }
  | { status: 'error'; user: null; error: Error };

type CurrentUserContextValue = CurrentUserState & {
  refresh(): Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const store = useStores();
  const users = useMemo(() => createUserService(store), [store]);
  const [state, setState] = useState<CurrentUserState>({ status: 'loading', user: null });
  const refresh = useCallback(async () => {
    setState({ status: 'loading', user: null });
    try {
      const principal = await getAuthClient().getPrincipal();
      if (!principal) {
        setState({ status: 'logged-out', user: null });
        return;
      }
      const user = await users.resolveAuthenticatedUser(principal);
      setState({ status: 'authenticated', user });
    } catch (error) {
      setState({ status: 'error', user: null, error: error instanceof Error ? error : new Error('Unable to resolve current user') });
    }
  }, [users]);
  useEffect(() => { void refresh(); }, [refresh]);
  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  const value = useContext(CurrentUserContext);
  if (!value) throw new Error('useCurrentUser() must be used within CurrentUserProvider');
  return value;
}
