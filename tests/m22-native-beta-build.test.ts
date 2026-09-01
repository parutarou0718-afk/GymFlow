import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('M22.3 keeps native build profiles credential-free and gives Supabase a build configuration fallback', async () => {
  const [easText, supabaseSource] = await Promise.all([
    readFile(resolve(process.cwd(), 'eas.json'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/lib/supabase.ts'), 'utf8'),
  ]);
  const eas = JSON.parse(easText) as { build?: Record<string, unknown> };

  assert.deepEqual(Object.keys(eas.build ?? {}).sort(), ['development', 'preview', 'production']);
  assert.match(supabaseSource, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(supabaseSource, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(easText, /service_role|SUPABASE_ANON_KEY|SUPABASE_URL/i);
});
