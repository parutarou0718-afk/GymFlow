export type ServerEnvironment = 'development' | 'test' | 'preview' | 'production';

export function parseServerEnvironment(value: string | undefined): ServerEnvironment {
  if (value === 'development' || value === 'test' || value === 'preview' || value === 'production') return value;
  return 'production';
}

export function allowsDevelopmentTestAccounts(environment: ServerEnvironment): boolean {
  return environment === 'development' || environment === 'test';
}

export type BetterAuthServerConfiguration = {
  environment: ServerEnvironment;
  databaseUrl: string;
  authUrl: string;
  secret: string;
};

export function loadServerConfiguration(source: Record<string, string | undefined> = process.env): BetterAuthServerConfiguration {
  const databaseUrl = source.DATABASE_URL?.trim();
  const authUrl = source.BETTER_AUTH_URL?.trim();
  const secret = source.BETTER_AUTH_SECRET?.trim();
  if (!databaseUrl || !authUrl || !secret) throw new Error('DATABASE_URL, BETTER_AUTH_URL, and BETTER_AUTH_SECRET are required');
  return { environment: parseServerEnvironment(source.GYMFLOW_ENV), databaseUrl, authUrl, secret };
}
