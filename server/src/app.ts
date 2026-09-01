import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Auth } from 'better-auth';
import { registerDevelopmentTestAccount, type DevelopmentTestAccount } from './development-test-accounts.js';
import type { ServerEnvironment } from './environment.js';

type AuthServer = Pick<Auth, 'handler' | 'api'>;

export function createApp(auth: AuthServer, environment: ServerEnvironment) {
  const app = new Hono();
  app.use('/api/auth/*', cors({ origin: ['gymflow://'], allowHeaders: ['Content-Type'], allowMethods: ['GET', 'POST', 'OPTIONS'], credentials: true }));
  app.post('/development/test-accounts', async (context) => {
    const account = await context.req.json<DevelopmentTestAccount>();
    try {
      const user = await registerDevelopmentTestAccount(environment, account, async (input) => {
        const result = await auth.api.signUpEmail({ body: { name: input.name, email: input.email, password: input.password } });
        return { id: result.user.id };
      });
      return context.json({ id: user.id }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create development test account';
      return context.json({ error: message }, message.includes('not available') ? 403 : 400);
    }
  });
  app.all('/api/auth/*', (context) => auth.handler(context.req.raw));
  return app;
}
