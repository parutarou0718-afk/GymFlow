import { betterAuth } from 'better-auth';
import { expo } from '@better-auth/expo';
import { Pool } from 'pg';
import type { BetterAuthServerConfiguration } from './environment.js';

export function createAuth(configuration: BetterAuthServerConfiguration) {
  const pool = new Pool({ connectionString: configuration.databaseUrl });
  return betterAuth({
    database: pool,
    baseURL: configuration.authUrl,
    secret: configuration.secret,
    trustedOrigins: ['gymflow://'],
    emailAndPassword: {
      enabled: configuration.environment === 'development' || configuration.environment === 'test',
      disableSignUp: configuration.environment !== 'development' && configuration.environment !== 'test',
      minPasswordLength: 8,
    },
    plugins: [expo()],
  });
}
