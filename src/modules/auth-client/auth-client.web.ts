import type { AuthClientPort } from './types';

const unavailableClient: AuthClientPort = {
  async getPrincipal() { return null; },
  async signIn() { throw new Error('Web authentication is not configured for this build'); },
  async signUp() { throw new Error('Web authentication is not configured for this build'); },
  async signOut() {},
};

export function getAuthClient(): AuthClientPort {
  return unavailableClient;
}
