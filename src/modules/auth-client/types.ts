import type { AuthenticatedPrincipal } from '../user';

export type EmailPasswordCredentials = {
  email: string;
  password: string;
  displayName?: string;
};

export interface AuthClientPort {
  getPrincipal(): Promise<AuthenticatedPrincipal | null>;
  signIn(credentials: EmailPasswordCredentials): Promise<AuthenticatedPrincipal>;
  signUp(credentials: Required<EmailPasswordCredentials>): Promise<AuthenticatedPrincipal>;
  signOut(): Promise<void>;
}
