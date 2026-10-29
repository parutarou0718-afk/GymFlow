import { getDatabase } from './database';

export async function bootstrapStorage(): Promise<void> {
  await getDatabase();
}
