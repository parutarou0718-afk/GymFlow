import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('M22.3 keeps production profiles unchanged and provides a standalone Android emulator QA profile', async () => {
  const [easText, supabaseSource] = await Promise.all([
    readFile(resolve(process.cwd(), 'eas.json'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/lib/supabase.ts'), 'utf8'),
  ]);
  const eas = JSON.parse(easText) as { build?: Record<string, unknown> };

  assert.deepEqual(Object.keys(eas.build ?? {}).sort(), ['development', 'preview', 'production', 'qa']);
  const qa = eas.build?.qa as { distribution?: unknown; developmentClient?: unknown; env?: Record<string, unknown> } | undefined;
  assert.equal(qa?.distribution, 'internal');
  assert.notEqual(qa?.developmentClient, true);
  assert.equal(qa?.env?.EXPO_PUBLIC_GYMFLOW_ENV, 'test');
  assert.equal(qa?.env?.EXPO_PUBLIC_AUTH_BASE_URL, 'http://10.0.2.2:3001');
  assert.match(supabaseSource, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(supabaseSource, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(easText, /service_role|SUPABASE_ANON_KEY|SUPABASE_URL/i);
});
