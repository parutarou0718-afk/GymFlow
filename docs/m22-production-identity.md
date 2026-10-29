# M22.1 Production Identity

## Purpose

M22.1 binds an authenticated principal to one stable GymFlow Domain User without allowing Supabase session objects to enter Gym, Program, Matching, Workout, Social, or Sharing business modules. It makes the authenticated Domain User the source of the explicit `userId` supplied by product flows.

## Identity boundary

The infrastructure adapter normalizes provider data to a provider-neutral `AuthenticatedPrincipal`:

```text
Supabase session
→ AuthenticatedPrincipal { provider, subject, email?, displayName? }
→ UserService.resolveAuthenticatedUser(principal)
→ Domain User { id, ... }
```

`UserProfile` persists the provider mapping (`authProvider`, `authSubject`). Resolving the same `(provider, subject)` is idempotent and returns the existing Domain User; a new Domain User is created only when that mapping does not yet exist. Domain services only receive the resulting `userId`.

## Current-user lifecycle

`CurrentUserProvider` is the sole application boundary for current identity. It exposes loading, authenticated, logged-out, error, and inactive-user states. Product screens wait for an authenticated Domain User and never choose `DEFAULT_LOCAL_USER_ID` themselves. Logging out clears the resolved actor and renders the explicit logged-out gate. A new login re-resolves its own Domain User, so A → logout → B cannot reuse A's cached actor.

Web has an intentionally explicit local-demo adapter for developer/test operation. That compatibility adapter alone may resolve `DEFAULT_LOCAL_USER_ID`; it is not a production authentication fallback.

## Ownership and local persistence

SQLite remains one shared local store for the Private Beta. Every private product read is owner-scoped, including normal lists and detail/get-by-id:

```text
Program / Workout / History read
→ explicit userId
→ ownerUserId comparison
→ record or null
```

Known IDs must not bypass this boundary. Shared Program and Workout access remains behind existing Sharing/Social visibility services, rather than generic private reads.

Workout completion records a Gym Visit using the persisted `WorkoutSession.ownerUserId`, never the identity that happens to be signed in when completion occurs.

Existing `local_default_user` data remains development/demo data and is not reassigned to a newly authenticated account. Authenticated users begin with separately owned records.

## Logout and account switching

Logout leaves the application unauthenticated. It does not select the local default user. On account switch, the provider clears the old principal, clears the resolved Domain User, and resolves the new principal before screens can issue user-scoped reads.

## Social for Private Beta

Social domain services, sharing semantics, and their tests are retained. Social UI is controlled through one central product feature flag and is disabled for the initial Private Beta because cloud authorization/RLS is deliberately out of scope for M22.1.

## Beta limitations

This slice does not provide cloud sync, account recovery on another device, RLS, or per-account database files. It establishes safe owner boundaries inside the shared local database and a stable authenticated identity mapping only.
