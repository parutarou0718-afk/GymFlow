import assert from 'node:assert/strict';
import test from 'node:test';
import { runMigrationLedger, type MigrationLedgerAdapter } from '../src/db/migrations';

function createAdapter(version: number | null, currentCompatibilityBaseline: boolean) {
  const applied: number[] = [];
  const written: number[] = [];
  const adapter: MigrationLedgerAdapter = {
    readVersion: async () => version,
    writeVersion: async next => {
      version = next;
      written.push(next);
    },
    isCurrentCompatibilityBaseline: async () => currentCompatibilityBaseline,
  };
  return { adapter, applied, written };
}

const migrations = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(version => ({
  version,
  name: `migration-${version}`,
  up: async () => undefined,
}));

test('migration ledger applies fresh installations in ordered versions exactly once', async () => {
  const state = createAdapter(null, false);
  const applied = await runMigrationLedger(state.adapter, migrations);

  assert.deepEqual(applied, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(state.written, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const secondRun = await runMigrationLedger(state.adapter, migrations);
  assert.deepEqual(secondRun, []);
  assert.deepEqual(state.written, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('migration ledger claims an already-current M11 schema baseline then applies M14 additions', async () => {
  const state = createAdapter(1, true);

  const applied = await runMigrationLedger(state.adapter, migrations);

  assert.deepEqual(applied, [7, 8, 9, 10]);
  assert.deepEqual(state.written, [6, 7, 8, 9, 10]);
});

test('migration ledger advances an older version-one database only through missing migrations', async () => {
  const state = createAdapter(1, false);

  const applied = await runMigrationLedger(state.adapter, migrations);

  assert.deepEqual(applied, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(state.written, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
