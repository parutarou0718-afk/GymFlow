import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createAuth } from './auth.js';
import { loadServerConfiguration } from './environment.js';

const configuration = loadServerConfiguration();
const app = createApp(createAuth(configuration), configuration.environment);
const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port });
console.info(`GymFlow auth server listening on ${port}`);
