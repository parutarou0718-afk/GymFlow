# Auth.1 + Auth.2 Foundation Design

## Scope

This implementation replaces the mobile authentication boundary with a provider-neutral port, adds an independently deployable Better Auth/PostgreSQL server foundation, and enables real development-only test accounts. It does not implement production phone/SMS, cloud data sync, or a public production registration flow.

## Architecture

`CurrentUserProvider` reads a normalized `AuthenticatedPrincipal` from `AuthClientPort`, then continues to use `UserService.resolveAuthenticatedUser()` for the stable GymFlow Domain User ID. The port is the only mobile/provider boundary. Domain services continue receiving explicit `userId` values; they never receive Better Auth objects, cookies, or phone/email credentials.

`server/` is an independent ESM package. Hono mounts Better Auth at `/api/auth/*`; Better Auth uses PostgreSQL through `DATABASE_URL` and trusts the mobile `gymflow://` scheme. The server adds only a development test-account endpoint. That endpoint is guarded by a testable `development`/`test` environment predicate before it invokes Better Auth, and the mobile UI is guarded separately.

## Security boundaries

- `DATABASE_URL`, `BETTER_AUTH_SECRET`, and all mail/SMS credentials remain only in `server/.env`.
- `EXPO_PUBLIC_AUTH_BASE_URL` is the only future mobile Auth configuration; it is an API URL, not a secret.
- Preview and production reject development test-account registration at the server even when called without the UI.
- Better Auth users map as `{ provider: 'better-auth', subject: user.id }`; Domain User IDs and existing Supabase mappings are not rewritten.
- The legacy Supabase sync module remains isolated and is not a Better Auth responsibility.

## Session behavior

The native Better Auth Expo client uses SecureStore. A valid provider session resolves the same principal/Domain User after restart. No principal, invalid session, or server failure causes a `local_default_user` fallback. Offline policy beyond this explicit state behavior is deferred.

## Compatibility and deployment

Use Hono because Better Auth's handler is directly compatible with Web Standard Request/Response. The server can be deployed independently. The mobile client uses Better Auth Expo dependencies plus `expo-network`; the required Expo SDK 54 build spike remains an acceptance item, not an assumed pass.

## Deferred production phone requirement

Preview/production access will eventually require a verified phone number, including after future social/OAuth login. This slice does not activate a phone plugin or issue any OTP; it only keeps the server/auth schema boundary separate so that a phone plugin can be added later.
