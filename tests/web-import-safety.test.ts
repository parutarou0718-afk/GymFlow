import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';

test('history components access sessions through the store instead of SQLite', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/components/history/index.tsx'), 'utf8');

  assert.doesNotMatch(source, /from ['"]\.\.\/\.\.\/db\/database['"]/);
  assert.match(source, /useStores/);
});

test('active workout provides a Home exit without routing through lifecycle actions', async () => {
  const [screen, workout] = await Promise.all([
    readFile(resolve(process.cwd(), 'app/active-workout.tsx'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/components/session/ActiveWorkout.tsx'), 'utf8'),
  ]);

  assert.match(screen, /onLeave=\{\(\) => router\.replace\('\/'\)\}/);
  assert.match(workout, /onLeave: \(\) => void;/);
  assert.match(workout, /onLeave=\{onLeave\}/);
  assert.match(workout, /onPress=\{onLeave\}/);
});

test('Home reloads workout totals whenever the tab receives focus', async () => {
  const source = await readFile(resolve(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

  assert.match(source, /useFocusEffect/);
  assert.match(source, /useFocusEffect\(\s*useCallback\(\(\) => \{\s*void loadData\(\);/s);
  assert.doesNotMatch(source, /useEffect\(\(\) => \{\s*loadData\(\);/);
});

test('Home reads dashboard data only through Workout and Program public APIs', async () => {
  const source = await readFile(resolve(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

  assert.match(source, /createWorkoutService/);
  assert.match(source, /createProgramService/);
  assert.doesNotMatch(source, /const \{\s*sessions\s*,\s*templates\s*\} = useStores\(\)/);
  assert.doesNotMatch(source, /\bstore\.(sessions|templates)\b/);
});

test('web store and bootstrap boundaries do not reference the native database', async () => {
  const [factory, bootstrap, supabase] = await Promise.all([
    readFile(resolve(process.cwd(), 'src/db/store-factory.web.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/db/storage-bootstrap.web.ts'), 'utf8'),
    readFile(resolve(process.cwd(), 'src/lib/supabase.web.ts'), 'utf8'),
  ]);

  assert.match(factory, /createWebStore/);
  assert.doesNotMatch(factory, /database/);
  assert.doesNotMatch(bootstrap, /database/);
  assert.doesNotMatch(supabase, /database/);
});
