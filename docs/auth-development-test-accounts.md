# Development authentication test accounts

## Scope

This is the Auth.1 + Auth.2 development-only path. It creates real Better Auth email/password users and sessions; it does not create fixture identities and it does not make Better Auth the owner of GymFlow Programs, Workouts, or Gym relationships.

The identity flow is:

```text
Better Auth user.id
  -> AuthenticatedPrincipal { provider: 'better-auth', subject: user.id }
  -> UserService.resolveAuthenticatedUser()
  -> stable GymFlow Domain User.id
```

All GymFlow business services continue to receive the Domain User ID. Provider sessions, cookies, and Better Auth user objects do not enter Program, Workout, Gym, Matching, History, or Social domain modules.

## Server configuration

The independently runnable server lives in [`server`](../server). Copy `server/.env.example` to an untracked `server/.env` and provide:

```text
GYMFLOW_ENV=development
DATABASE_URL=postgres://.../gymflow_auth
BETTER_AUTH_URL=http://127.0.0.1:3001
BETTER_AUTH_SECRET=<long random secret>
```

`DATABASE_URL`, `BETTER_AUTH_SECRET`, and any production credentials stay only in server-side secret management. The server expects a PostgreSQL database; it neither provisions a database nor stores GymFlow training-domain data in PostgreSQL. Better Auth owns only its authentication tables.

Run the server with `npm --prefix server run dev`. Before the first start against a PostgreSQL database, copy `server/.env.example` to the untracked `server/.env`, set the configuration above, then run:

```text
npm --prefix server run auth:migrate
```

The command loads `server/.env` through the CLI-only [`server/src/auth-cli.ts`](../server/src/auth-cli.ts) entrypoint and presents Better Auth's database migration flow. It reuses the same `createAuth()` and server configuration as runtime; it does not provision PostgreSQL or commit environment values.

For an Android emulator, the app must use an emulator-reachable host such as `http://10.0.2.2:3001` for `EXPO_PUBLIC_AUTH_BASE_URL`; a physical device must use a reachable HTTPS/LAN endpoint. Do not use a host loopback address from the device.

The standalone Android `qa` profile sets `EXPO_PUBLIC_GYMFLOW_ENV=test` and `EXPO_PUBLIC_AUTH_BASE_URL=http://10.0.2.2:3001`. Its native build enables Android cleartext traffic only for `development` and `test`; preview and production build manifests remain HTTPS-only.

## Development account flow

Set both build values for a development build:

```text
EXPO_PUBLIC_GYMFLOW_ENV=development
EXPO_PUBLIC_AUTH_BASE_URL=http://10.0.2.2:3001
```

The logged-out screen is explicitly labelled **Development Test Account**. Create two `@gymflow.local` accounts, such as `test-a@gymflow.local` and `test-b@gymflow.local`, with passwords of at least eight characters. These are ordinary Better Auth users; sign-in creates/restores a real SecureStore-backed session.

To verify account switching: sign in as A, create an owned item, use **Sign Out**, then sign in as B. The app resolves B through the same current-user boundary. Existing owner-scoped Program, Workout, History, Current Gym, and User-Gym APIs must not surface A's private records to B.

## Non-negotiable environment guard

Only `GYMFLOW_ENV=development` and `GYMFLOW_ENV=test` enable email/password sign-up and the server's `/development/test-accounts` registration endpoint. The server rejects the endpoint before Better Auth registration in `preview` and `production`; the mobile UI also omits development controls there.

The client guard is a usability measure. The server guard is the authority. A preview/production build must never quietly fall back to `local_default_user` or accept development test-account registration.

Preview and production are intentionally logged out until the future verified-phone flow is implemented. No SMS delivery, phone UI, reset flow, or verification provider is included in this slice. The future public path must require verified phone identity before it becomes available.

## Logout and local persistence

Signing out clears the Better Auth session and returns to the explicit logged-out gate. It does not delete SQLite data. SQLite is a shared local Beta store, so private reads and detail-by-ID access must remain owner-scoped. A Workout Visit uses the persisted `WorkoutSession.ownerUserId`, not the account authenticated at completion time.

`DEFAULT_LOCAL_USER_ID` remains only for tests, developer fixtures, and legacy compatibility APIs. It is not a product-runtime actor in authenticated paths.

## Supabase boundary

The old Supabase module remains only as dormant legacy snapshot/template sync infrastructure. Startup no longer processes its queue, and the authentication UI no longer configures or invokes it. Better Auth does not implement cloud sync or replace Supabase sync semantics; Local SQLite remains the Private Beta training-data store.
