import type { WorkoutSnapshot } from '../types';

// Web is a non-persistent development preview. Cloud configuration and sync
// remain native-only until a dedicated Web persistence design is introduced.
export async function getSupabaseClient(): Promise<null> {
  return null;
}

export async function configureSupabase(_url: string, _anonKey: string): Promise<void> {}

export async function isConfigured(): Promise<boolean> {
  return false;
}

export async function signInWithEmail(_email: string, _password: string): Promise<{ user: null; error?: string }> {
  return { user: null, error: 'Cloud sync is unavailable in the Web preview' };
}

export async function signUpWithEmail(_email: string, _password: string): Promise<{ user: null; error?: string }> {
  return { user: null, error: 'Cloud sync is unavailable in the Web preview' };
}

export async function signOut(): Promise<void> {}

export async function getCurrentUser(): Promise<null> {
  return null;
}

export async function syncSnapshot(_snapshot: WorkoutSnapshot): Promise<boolean> {
  return false;
}

export async function syncTemplate(_template: unknown): Promise<boolean> {
  return false;
}

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  return { synced: 0, failed: 0 };
}

export async function syncTemplatesToCloud(): Promise<number> {
  return 0;
}
