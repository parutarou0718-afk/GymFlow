import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';

test('history components access sessions through the store instead of SQLite', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/components/history/index.tsx'), 'utf8');

  assert.doesNotMatch(source, /from ['"]\.\.\/\.\.\/db\/database['"]/);
  assert.match(source, /useStores/);
});
