import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const screenPath = resolve(process.cwd(), 'app/program-detail.tsx');

test('Program Detail uses the public training flow to match and start at the active Current Gym', async () => {
  const source = await readFile(screenPath, 'utf8');

  assert.match(source, /Train at/);
  assert.match(source, /matchProgramForCurrentGym/);
  assert.match(source, /startProgramWorkoutAtCurrentGym/);
  assert.match(source, /status === 'active'/);
  assert.doesNotMatch(source, /store\.(?:sessions|templates|gyms|userGyms)/);
});

test('Program Detail maps every existing Gym-match outcome without sending ready programs to replacement review', async () => {
  const source = await readFile(screenPath, 'utf8');

  assert.match(source, /fully_executable/);
  assert.match(source, /executable_with_warnings/);
  assert.match(source, /requires_adaptation/);
  assert.match(source, /not_executable/);
  assert.match(source, /Ready with changes/);
  assert.match(source, /Cannot run here/);
  assert.match(
    source,
    /match\?\.status === 'requires_adaptation'[\s\S]{0,600}replacement-review/,
  );
});
