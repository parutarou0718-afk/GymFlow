// ========================================
// GymFlow - Supabase Sync Layer
// ========================================

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { WorkoutSnapshot, SyncQueueItem } from '../types';
import { getPendingSyncItems, updateSyncStatus, getDatabase } from '../db/database';

// --- Constants ---
const SUPABASE_URL_KEY = 'gymflow_supabase_url';
const SUPABASE_ANON_KEY = 'gymflow_supabase_anon_key';
const SESSION_TOKEN_KEY = 'gymflow_supabase_session';

// --- Client ---
let supabaseClient: ReturnType<typeof createClient> | null = null;

export async function getSupabaseClient(): Promise<ReturnType<typeof createClient> | null> {
  if (Platform.OS === 'web') return null;
  if (supabaseClient) return supabaseClient;

  const url = await SecureStore.getItemAsync(SUPABASE_URL_KEY);
  const anonKey = await SecureStore.getItemAsync(SUPABASE_ANON_KEY);

  if (!url || !anonKey) return null;

  supabaseClient = createClient(url, anonKey, {
    auth: {
      storage: {
        getItem: async (key: string) => SecureStore.getItemAsync(key),
        setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
      },
    },
  });

  return supabaseClient;
}

export async function configureSupabase(url: string, anonKey: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(SUPABASE_URL_KEY, url);
  await SecureStore.setItemAsync(SUPABASE_ANON_KEY, anonKey);
  supabaseClient = null; // reset
}

export async function isConfigured(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const url = await SecureStore.getItemAsync(SUPABASE_URL_KEY);
  const key = await SecureStore.getItemAsync(SUPABASE_ANON_KEY);
  return !!(url && key);
}

// ========================================
// Auth
// ========================================

export async function signInWithEmail(email: string, password: string): Promise<{ user: any; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { user: null, error: 'Supabase not configured' };

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user };
}

export async function signUpWithEmail(email: string, password: string): Promise<{ user: any; error?: string }> {
  const client = await getSupabaseClient();
  if (!client) return { user: null, error: 'Supabase not configured' };

  const { data, error } = await client.auth.signUp({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user };
}

export async function signOut(): Promise<void> {
  const client = await getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function getCurrentUser(): Promise<any> {
  const client = await getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data?.user || null;
}

// ========================================
// Sync
// ========================================

export async function syncSnapshot(snapshot: WorkoutSnapshot): Promise<boolean> {
  const client = await getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('sessions')
    .upsert({
      id: snapshot.sessionId,
      template_id: snapshot.planId,
      snapshot: snapshot,
      started_at: new Date(snapshot.startedAt).toISOString(),
      finished_at: snapshot.finishedAt ? new Date(snapshot.finishedAt).toISOString() : null,
    } as any, { onConflict: 'id' });

  if (error) {
    console.error('Sync failed:', error.message);
    return false;
  }
  return true;
}

export async function syncTemplate(template: any): Promise<boolean> {
  const client = await getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('templates')
    .upsert({
      id: template.id,
      snapshot: template,
    } as any, { onConflict: 'id' });

  return !error;
}

// Process all pending sync items
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const client = await getSupabaseClient();
  if (!client) return { synced: 0, failed: 0 };

  const items = await getPendingSyncItems();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    await updateSyncStatus(item.id, 'syncing');
    const success = await syncSnapshot(item.snapshot);
    if (success) {
      await updateSyncStatus(item.id, 'completed');
      synced++;
    } else {
      await updateSyncStatus(item.id, 'failed', 'Sync failed');
      failed++;
    }
  }

  return { synced, failed };
}

// ========================================
// Sync Templates to Cloud
// ========================================

export async function syncTemplatesToCloud(): Promise<number> {
  const client = await getSupabaseClient();
  if (!client) return 0;

  const db = await getDatabase();
  const rows = await db.getAllAsync<{ snapshot: string }>(
    'SELECT snapshot FROM templates ORDER BY updated_at DESC'
  );

  let synced = 0;
  for (const row of rows) {
    const template = JSON.parse(row.snapshot);
    const ok = await syncTemplate(template);
    if (ok) synced++;
  }

  return synced;
}
