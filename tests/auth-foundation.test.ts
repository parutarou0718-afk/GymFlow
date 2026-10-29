import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { allowsDevelopmentTestAccounts } from '../src/modules/auth-client/environment';
import { createWebStore } from '../src/db/web-store';
import { createUserService, type AuthenticatedPrincipal } from '../src/modules/user';

test('only development and test allow development test accounts', () => {
  assert.equal(allowsDevelopmentTestAccounts('development'), true);
  assert.equal(allowsDevelopmentTestAccounts('test'), true);
  assert.equal(allowsDevelopmentTestAccounts('preview'), false);
  assert.equal(allowsDevelopmentTestAccounts('production'), false);
  assert.equal(allowsDevelopmentTestAccounts(undefined), false);
});

test('a Better Auth principal resolves idempotently to a Domain User', async () => {
  const principal: AuthenticatedPrincipal = { provider: 'better-auth', subject: 'better-auth-a', email: 'test-a@gymflow.local', displayName: 'Test A' };
  const users = createUserService(createWebStore());
  const first = await users.resolveAuthenticatedUser(principal);
  const second = await users.resolveAuthenticatedUser(principal);

  assert.equal(first.id, second.id);
  assert.equal(first.authProvider, 'better-auth');
  assert.equal(first.authSubject, 'better-auth-a');
});

test('CurrentUser depends on the provider-neutral auth client rather than Supabase', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/modules/current-user/index.tsx'), 'utf8');
  assert.match(source, /from ['"]\.\.\/auth-client['"]/);
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /DEFAULT_LOCAL_USER_ID/);
});

test('development test account controls are environment-gated and no longer configure Supabase in the product UI', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/components/auth/Settings.tsx'), 'utf8');
  assert.match(source, /allowsDevelopmentTestAccounts/);
  assert.match(source, /Development Test Account/);
  assert.doesNotMatch(source, /configureSupabase|Supabase URL|Anon Key|syncTemplatesToCloud/);
});
