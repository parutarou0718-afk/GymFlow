import 'dotenv/config';
import { createAuth } from './auth.js';
import { loadServerConfiguration } from './environment.js';

export const auth = createAuth(loadServerConfiguration());

export default auth;
