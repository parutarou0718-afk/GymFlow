import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import type { AuthenticatedPrincipal } from '../user';
import { allowsDevelopmentTestAccounts } from './environment';
import type { AuthClientPort, EmailPasswordCredentials } from './types';

type BetterAuthUser = { id: string; email?: string | null; name?: string | null };

function configuredBaseUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_AUTH_BASE_URL?.trim();
  return value || null;
}

function authError(message: string): Error {
  return new Error(message);
}

function toPrincipal(user: BetterAuthUser | null | undefined): AuthenticatedPrincipal {
  if (!user?.id) throw authError('Authentication did not return an account');
  return { provider: 'better-auth', subject: user.id, email: user.email ?? null, displayName: user.name ?? null };
}

function clientFor(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [expoClient({ scheme: 'gymflow', storage: SecureStore })],
  });
}

export function getAuthClient(): AuthClientPort {
  const baseURL = configuredBaseUrl();
  return {
    async getPrincipal() {
      if (!baseURL) return null;
      const client = clientFor(baseURL);
      const result = await client.getSession();
      if (result.error) throw authError(result.error.message ?? 'Unable to restore authentication session');
      return result.data?.user ? toPrincipal(result.data.user) : null;
    },
    async signIn(credentials: EmailPasswordCredentials) {
      if (!baseURL) throw authError('Authentication is not configured for this build');
      const result = await clientFor(baseURL).signIn.email({ email: credentials.email, password: credentials.password });
      if (result.error) throw authError(result.error.message ?? 'Unable to sign in');
      return toPrincipal(result.data?.user);
    },
    async signUp(credentials) {
      if (!allowsDevelopmentTestAccounts()) throw authError('Development test accounts are not available in this build');
      if (!baseURL) throw authError('Authentication is not configured for this build');
      const result = await clientFor(baseURL).signUp.email({ name: credentials.displayName, email: credentials.email, password: credentials.password });
      if (result.error) throw authError(result.error.message ?? 'Unable to create development test account');
      return toPrincipal(result.data?.user);
    },
    async signOut() {
      if (!baseURL) return;
      const result = await clientFor(baseURL).signOut();
      if (result.error) throw authError(result.error.message ?? 'Unable to sign out');
    },
  };
}
