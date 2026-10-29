import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const authCliPath = resolve(process.cwd(), 'src/auth-cli.ts');
const packagePath = resolve(process.cwd(), 'package.json');

test('Better Auth migration CLI has a dedicated environment-backed auth instance', async () => {
  const source = await readFile(authCliPath, 'utf8');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
    scripts?: Record<string, string | undefined>;
  };

  assert.match(source, /import ['"]dotenv\/config['"]/);
  assert.match(source, /import \{ createAuth \} from ['"]\.\/auth\.js['"]/);
  assert.match(source, /import \{ loadServerConfiguration \} from ['"]\.\/environment\.js['"]/);
  assert.match(source, /export const auth = createAuth\(loadServerConfiguration\(\)\)/);
  assert.match(source, /export default auth/);
  assert.equal(packageJson.scripts?.['auth:migrate'], 'npx auth@latest migrate --config src/auth-cli.ts');
});
