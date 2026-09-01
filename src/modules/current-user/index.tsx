import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useStores } from '../../db/stores';
import { getCurrentUser as getSupabaseUser } from '../../lib/supabase';
import { createUserService, DEFAULT_LOCAL_USER_ID, type AuthenticatedPrincipal, type UserProfile } from '../user';

export type CurrentUserState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: UserProfile }
  | { status: 'logged-out'; user: null }
  | { status: 'error'; user: null; error: Error };

type CurrentUserContextValue = CurrentUserState & {
  refresh(): Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function normalizePrincipal(value: unknown): AuthenticatedPrincipal | null {
  if (!value || typeof value !== 'object') return null;
  const user = value as { id?: unknown; email?: unknown; user_metadata?: { full_name?: unknown; name?: unknown } };
  if (typeof user.id !== 'string' || !user.id.trim()) return null;
  const displayName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null;
  return { provider: 'supabase', subject: user.id, email: typeof user.email === 'string' ? user.email : null, displayName };
}

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const store = useStores();
  const users = useMemo(() => createUserService(store), [store]);
  const [state, setState] = useState<CurrentUserState>({ status: 'loading', user: null });
  const refresh = useCallback(async () => {
    setState({ status: 'loading', user: null });
    try {
      if (Platform.OS === 'web') {
        const user = await users.getUser(DEFAULT_LOCAL_USER_ID);
        if (!user) throw new Error('Local demo user is unavailable');
        setState({ status: 'authenticated', user });
        return;
      }
      const principal = normalizePrincipal(await getSupabaseUser());
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
