import assert from 'node:assert/strict';
import test from 'node:test';
import { registerDevelopmentTestAccount } from '../src/development-test-accounts.js';

const account = { name: 'GymFlow Test A', email: 'test-a@gymflow.local', password: 'test-password-123' };

test('development test account registration reaches Better Auth only in development and test', async () => {
  let registrations = 0;
  const register = async () => { registrations += 1; return { id: 'better-auth-a' }; };

  const development = await registerDevelopmentTestAccount('development', account, register);
  const testing = await registerDevelopmentTestAccount('test', account, register);

  assert.equal(development.id, 'better-auth-a');
  assert.equal(testing.id, 'better-auth-a');
  assert.equal(registrations, 2);
});

test('preview and production reject development test accounts before Better Auth registration', async () => {
  let registrations = 0;
  const register = async () => { registrations += 1; return { id: 'must-not-be-created' }; };

  await assert.rejects(() => registerDevelopmentTestAccount('preview', account, register), /not available/i);
  await assert.rejects(() => registerDevelopmentTestAccount('production', account, register), /not available/i);
  assert.equal(registrations, 0);
});
