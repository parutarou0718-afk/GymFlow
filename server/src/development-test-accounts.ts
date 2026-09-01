import { allowsDevelopmentTestAccounts, type ServerEnvironment } from './environment.js';

export type DevelopmentTestAccount = {
  name: string;
  email: string;
  password: string;
};

type RegisteredAccount = { id: string };
type RegisterAccount = (account: DevelopmentTestAccount) => Promise<RegisteredAccount>;

function validateAccount(account: DevelopmentTestAccount): void {
  if (!account.name.trim()) throw new Error('A development test account needs a name');
  if (!account.email.endsWith('@gymflow.local')) throw new Error('Development test accounts must use the @gymflow.local domain');
  if (account.password.length < 8) throw new Error('Development test account passwords must contain at least 8 characters');
}

export async function registerDevelopmentTestAccount(
  environment: ServerEnvironment,
  account: DevelopmentTestAccount,
  register: RegisterAccount,
): Promise<RegisteredAccount> {
  if (!allowsDevelopmentTestAccounts(environment)) throw new Error('Development test accounts are not available in this environment');
  validateAccount(account);
  return register(account);
}
