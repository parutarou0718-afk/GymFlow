import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

test('Active Workout protects its header with the native top safe area', async () => {
  const source = await readFile(
    resolve(process.cwd(), 'src/components/session/ActiveWorkout.tsx'),
    'utf8',
  );

  assert.match(source, /import \{ SafeAreaView \} from ['"]react-native-safe-area-context['"]/);
  assert.match(source, /<SafeAreaView style=\{styles\.container\} edges=\{\[['"]top['"]\]\}>/);
});

test('Active Workout displays a completion failure and leaves the workout retryable', async () => {
  const source = await readFile(
    resolve(process.cwd(), 'src/components/session/ActiveWorkout.tsx'),
    'utf8',
  );

  assert.match(source, /engine\.handleFinish\(\)\.catch\(/);
  assert.match(source, /Alert\.alert\(\s*['"]Unable to finish workout['"]/);
  assert.match(source, /Try again\./);
});
