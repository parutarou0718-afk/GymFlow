import { getDatabase } from './database';
import { processSyncQueue } from '../lib/supabase';

export async function bootstrapStorage(): Promise<void> {
  await getDatabase();
  await processSyncQueue();
}
