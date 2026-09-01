# Auth Provider Replacement Audit

**Status:** superseded as an audit-only document by Auth.1 + Auth.2 implementation. See [development authentication test accounts](auth-development-test-accounts.md) for the active development setup. Better Auth is now the runtime authentication boundary; Supabase snapshot/template sync remains dormant legacy infrastructure and is not a Better Auth responsibility.

**Starting baseline:** `1ea06e669e5025275bcee0af8d8c2482ad470308`

## A. Current Supabase dependency map

| Area | Current dependency | Classification | Replacement observation |
| --- | --- | --- | --- |
| `src/lib/supabase.ts` | Supabase client construction, SecureStore session storage, email/password methods, and snapshot/template sync | Infrastructure-only, but conflates auth and legacy sync | Split the provider-neutral auth adapter from the legacy sync implementation before deleting the SDK. Better Auth is not a sync replacement. |
| `src/lib/supabase.web.ts` | Web no-op version of the native API | Infrastructure-only | Replace with a provider-neutral Web development adapter or keep an explicit non-production demo adapter. |
| `src/modules/current-user/index.tsx` | Directly calls `getCurrentUser` from the Supabase module and normalizes its user shape | Current-user boundary | This is the intended replacement point, but it should depend on an `AuthClientPort`, not a provider module. |
| `src/components/auth/Settings.tsx` | Manual Supabase endpoint/anon-key configuration, sign-in/up/out, and Sync Now | UI | Preview/production must use a build-supplied Auth API URL. Normal users must not select an auth backend or see cloud-sync controls. |
| `src/db/storage-bootstrap.native.ts` | Calls `processSyncQueue()` from the Supabase module at launch | Infrastructure lifecycle | Disable or independently feature-gate the legacy queue for the local-first Beta. Do not make Better Auth own Workout snapshots. |
| `src/lib/config.ts` | Imports Supabase configuration symbols but does not use them | Dead coupling | Remove during replacement. |
| `src/modules/user/*` | Stores `authProvider`/`authSubject` and resolves an `AuthenticatedPrincipal` | Domain mapping, no SDK import | Preserve the mapping. Its `AuthProvider` type is currently narrowed to `'supabase'`, which must become a provider-neutral identifier before Better Auth is introduced. |
| Program, Workout, Gym, Matching, History, Social | Receive/use domain `userId`; no Supabase imports found | Domain | No provider-object migration is required. Existing owner-scoped APIs remain the security boundary. |
| `tests/m22-production-identity.test.ts` | Uses synthetic principals marked `provider: 'supabase'` | Test coupling | Retarget to provider-neutral fixtures and add Better Auth adapter/lifecycle tests. |
| `tests/m22-native-beta-build.test.ts`, `eas.json`, M22.3 documentation | Checks/requires `EXPO_PUBLIC_SUPABASE_*` | Build/documentation coupling | Replace with one public Better Auth API base URL configuration and update the native acceptance procedure after the runtime migration. |

`better-auth@1.7.2`, `@better-auth/expo@1.7.2`, and `expo-network@8.0.8` are installed for the implemented auth foundation. `@supabase/supabase-js@2.109.0` remains only because legacy sync has not been deleted or replaced.

### Dependency conclusion

Supabase SDK imports do not appear in the protected business modules. However, the current-user provider directly knows Supabase and the provider union only allows Supabase. The future replacement is therefore bounded, but it is not a one-file package swap. The old Supabase snapshot/template sync must be explicitly retired or independently gated because the M22 contract is local SQLite canonical storage without cloud-sync promises.

## B. Better Auth target architecture

```text
GymFlow Expo app
  -> provider-neutral AuthClientPort
  -> Better Auth Expo client + SecureStore cookie/session cache
  -> HTTPS https://api.gymflow.<domain>/api/auth
  -> Better Auth server
  -> PostgreSQL auth schema

AuthenticatedPrincipal { provider: 'better-auth', subject: BetterAuthUser.id }
  -> UserService.resolveAuthenticatedUser(...)
  -> stable GymFlow Domain User.id
  -> existing owner-scoped Program / Workout / Gym / History / Social services
```

The Expo client must not send Better Auth user/session objects into the domain. The narrow port should return only a normalized principal:

```ts
interface AuthClientPort {
  getSession(): Promise<AuthenticatedPrincipal | null>;
  signIn(input: { email: string; password: string }): Promise<AuthenticatedPrincipal>;
  signUp(input: { email: string; password: string; name?: string }): Promise<AuthenticatedPrincipal>;
  signOut(): Promise<void>;
}
```

The Better Auth implementation belongs in infrastructure code. Its Expo client uses `better-auth/react`, `@better-auth/expo/client`, and `expo-secure-store`; the server enables the Better Auth Expo plugin and email/password. The app scheme remains `gymflow`, and the server must trust the exact production `gymflow://` origin—not development wildcard origins in production. Better Auth's official Expo guide requires an existing backend, SecureStore-backed Expo client setup, and the Expo plugin; it also states that Metro package exports work by default from Expo SDK 53 onward. [Expo integration](https://better-auth.com/docs/integrations/expo)

## C. Files requiring changes

| Path | Current role | Required future change | Risk |
| --- | --- | --- | --- |
| `package.json` | Declares Supabase SDK and current Expo packages | Remove Supabase only after its auth and sync call sites are gone; add pinned compatible `better-auth`, `@better-auth/expo`, and `expo-network` versions. | M |
| `src/lib/supabase.ts` / `.web.ts` | Combined auth and sync adapter | Replace auth portion with a provider-neutral port implementation; retire/gate sync separately. | L |
| `src/modules/current-user/index.tsx` | Supabase-specific session read and normalization | Inject/use the port; normalize only its provider-neutral principal. Preserve logged-out/error states. | M |
| `src/modules/user/types.ts` | `AuthProvider = 'supabase'` | Use a provider-neutral provider ID (or at least include `'better-auth'`), while retaining string subject mapping. | S |
| `src/modules/user/user-service.ts` | Idempotent principal-to-Domain-User resolver | Keep behavior; add no Better Auth import. Add an explicit future multi-identity migration design before supporting live migration. | S |
| `src/components/auth/Settings.tsx` | User-configurable Supabase and sync UI | Replace with focused email/password UI; hide backend configuration and Sync Now in preview/production. | M |
| `src/db/storage-bootstrap.native.ts` | Opens SQLite then triggers Supabase queue processing | Keep SQLite bootstrap; remove/gate legacy sync startup independently. | S |
| `app/_layout.tsx` | Auth gate | Continue using `CurrentUserProvider`; no provider-specific UI logic. | XS |
| `eas.json`, M22.3 tests/docs | Supabase public variables and acceptance wording | Use a public `EXPO_PUBLIC_AUTH_BASE_URL`; never bundle database/server secrets. | S |
| `tests/m22-production-identity.test.ts` | Identity/isolation coverage with Supabase-named fixtures | Rename fixtures; add lifecycle and outage tests below. | M |

Recommended server placement: **a separate `gymflow-auth` repository**. GymFlow currently is an Expo application with no server build, deployment, database migration, or secret-management workflow. A separate repository gives deployment and secret isolation with negligible shared-type cost because the mobile/domain boundary is only `AuthenticatedPrincipal`; it does not prevent a future monorepo if shared server work later justifies it.

## D. Domain invariants preserved

- Better Auth objects, JWTs, cookies, and SDK imports stay outside Program, Workout, Gym, Matching, History, and Social modules.
- `UserService.resolveAuthenticatedUser()` continues to map one provider subject to one stable GymFlow Domain User ID.
- Existing owner-scoped list and detail APIs remain mandatory. Knowing a Program or Workout ID is not private-read authority.
- `WorkoutSession.ownerUserId` remains durable. Completion records a Visit from that persisted owner, not from whichever account is currently authenticated.
- `WorkoutSession.gymId` remains the Workout Gym authority; auth replacement does not alter Current Gym, adaptation, replacement, immutability, or completion semantics.
- `DEFAULT_LOCAL_USER_ID` remains test/development-only. Preview and production logout never resolve it.

## E. PostgreSQL/Auth schema strategy

Recommend **one PostgreSQL instance with separate logical schemas**:

```text
auth      -> Better Auth-owned user, session, account, verification, and plugin tables
gymflow   -> future cloud domain tables, if/when M22 later adds them
```

This is option A. It preserves operational simplicity for a small Beta while separating table ownership and migration responsibility. Use a dedicated restricted database role and `search_path=auth` for the Better Auth server; do not let it own future GymFlow domain tables. Better Auth supports PostgreSQL and non-default schemas, and its CLI migration process recognizes the configured schema path. [PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql) [Database and migrations](https://better-auth.com/docs/concepts/database)

Do not create cloud GymFlow data tables in this replacement. Local SQLite remains canonical for the stated Private Beta contract.

## F. Session lifecycle

| State | Required behavior |
| --- | --- |
| Cold start, valid cached session | Expo client restores its SecureStore-backed session/cookie, resolves `AuthenticatedPrincipal('better-auth', id)`, then idempotently resolves the same Domain User. Refresh server session data when reachable. |
| Cold start, no session | Enter explicit logged-out auth gate. Never load `local_default_user`. |
| Expired/revoked session | Clear local auth session and enter logged-out state when the provider can establish expiry/revocation. Do not resolve another Domain User. |
| Sign out | Call provider sign-out, clear the client session/cookie, clear current-user state, and show the auth gate. Local records remain owner-scoped in SQLite; the next account sees only its own data through public APIs. |
| Account A -> logout -> B | Invalidate provider/current-user cache before B actions. Resolve B to a distinct Domain User, and use B's explicit ID for every user-scoped operation. |
| Auth server/network unavailable | Do not synthesize a principal. Follow the bounded offline recommendation below. |

Better Auth documents that its Expo client stores session data and cookies in SecureStore; requests to another protected server endpoint need the retrieved cookie attached explicitly. [Expo session/cookie behavior](https://better-auth.com/docs/integrations/expo)

## G. Offline behavior recommendation

Permit bounded local training access only when Better Auth has a previously cached, unexpired session for this device. Treat this as cached authentication trust, not server authorization: owner-scoped SQLite data can be used, but public/community/cloud actions stay unavailable until server connectivity returns.

Do not invent a permanent offline login or extend an expired session. If no cached session exists, the session has expired, or the user explicitly logged out, show the logged-out gate. When connectivity returns, revalidate; if the server reports revocation/expiry, clear the local session and return to logged out. This balances a local-first workout with the fact that offline code cannot learn immediate server-side revocation.

## H. China-first deployment considerations

- Deploy the auth API and PostgreSQL in infrastructure the team controls and can operate for the intended cohort. The Expo app contains only the public HTTPS API base URL; all database credentials, Better Auth secrets, and email-provider credentials stay server-side.
- Validate that the chosen public domain, DNS, TLS chain, and email sender are reachable from the target mainland-China networks before recruiting users. If the API is hosted in mainland China, obtain local legal/hosting guidance for domain and filing requirements; this audit makes no compliance conclusion.
- Email/password reset and verification require an operational transactional-email provider with deliverability to the target mailboxes. Better Auth supplies hooks for verification and reset delivery; it does not remove the need to choose and operate the mail provider. [Email/password and verification](https://better-auth.com/docs/concepts/email)
- Do not add SMS/phone login, OAuth, MFA, or passkeys in the first replacement. They increase vendor, deliverability, deep-link, and support surface without being required for the Beta.

## I. Migration implications

Current mapping is one pair of `users.auth_provider`/`auth_subject` fields, and its provider type is Supabase-only. It must not be silently rewritten.

The immediate risk is low: M22.3 has not yet produced installed native-device evidence, so this repository does not demonstrate a live real-user Supabase cohort. Treat existing local Supabase-mapped data as development/Beta-preparation data unless product operations identify real users before migration.

For a future live migration, add a deliberate identity-link design before data movement:

1. New Better Auth users map normally as `{ provider: 'better-auth', subject: BetterAuthUser.id }`.
2. A legacy identity is linked only after proving control of both identities in a controlled migration flow; email equality alone is not sufficient authority.
3. Preserve the Domain User ID and its locally owned records. Do not claim or reassign another user's SQLite records.
4. The present single-pair mapping cannot represent concurrent provider identities safely. Use an additive `user_auth_identities` relation or a one-time, auditable cutover tool before any live-user migration.

No migration is required for disposable pre-Beta fixtures. No migration should run in the first Better Auth implementation slice.

## J. Better Auth vs alternatives

| Option | Self-host / China deployability | Expo fit | Database control | Operational cost | Verdict for GymFlow |
| --- | --- | --- | --- | --- | --- |
| Better Auth | High; independent HTTPS server + PostgreSQL | Official Expo/SecureStore integration | High | Medium | Best fit if the Expo compatibility spike passes. |
| SuperTokens | High | Viable generic React Native integration, less aligned with the present Expo path | High | Medium-high | Reasonable fallback, but no stronger repository-specific advantage. |
| Custom auth | High | Whatever the team builds | Highest | Very high security and recovery burden | Reject for this Beta. |
| Supabase Auth | Lowest for the stated no-Supabase production dependency goal | Already integrated | Lower infrastructure control | Low short-term | Keep only until cutover; it conflicts with the target deployment boundary. |

## K. Implementation slices

1. **Auth.1 — Provider-neutral mobile auth port.** Extract the current-user dependency, widen the provider ID, split/gate legacy Supabase sync, and preserve all M22.1 owner-isolation tests. No Better Auth dependency yet.
2. **Auth.2 — Isolated Better Auth server.** In a separate repository, configure Better Auth email/password + Expo plugin, PostgreSQL `auth` schema, server secrets, trusted `gymflow://` origin, email reset, and verification delivery. Run Better Auth schema generation/migration only in that server environment.
3. **Auth.3 — Expo client adapter.** Add pinned Better Auth Expo dependencies, the build-time `EXPO_PUBLIC_AUTH_BASE_URL`, SecureStore client, and the adapter implementation. Run an Expo SDK 54 native build spike before accepting compatibility.
4. **Auth.4 — Product auth UI.** Replace manual Supabase configuration with fixed-backend sign-up/sign-in/reset/verification flows; remove Sync Now from preview/production. Update EAS configuration and M22.3 acceptance documents.
5. **Auth.5 — Identity and native acceptance.** Prove sign-up -> Domain User, repeat sign-in -> same Domain User, restart restore, logout, A/B switch, owner-scoped local isolation, expired/invalid session, server outage, and no provider objects in business modules.

Required tests in Auth.5: A sign-up maps to a Domain User; B sign-in maps to the same Domain User; C restart restores the same principal/User; D logout is explicit unauthenticated; E A->B switches actors; F B cannot read A local private data; G outage never becomes another user; H expiry/invalid session logs out; I static boundaries reject provider SDK imports in domain modules.

## L. Recommendation

## GO — Better Auth

GymFlow's owner-scoped domain architecture already isolates provider identity at the correct conceptual boundary, and Better Auth supports the required self-hosted HTTPS + PostgreSQL model with an official Expo/SecureStore integration. The major blockers are implementation gates, not domain redesign:

1. Better Auth's current Expo guide is written for SDK 55, while GymFlow is on SDK 54. Its documented Metro package-export requirement is SDK 53+, and the current package peer ranges cover the Expo packages GymFlow already has except `expo-network`; nevertheless, run a disposable SDK 54 native build spike before committing to the replacement. Do not upgrade Expo as part of this audit. [Expo guide](https://better-auth.com/docs/integrations/expo) [Expo package manifest](https://github.com/better-auth/better-auth/blob/main/packages/expo/package.json)
2. Split/gate the current Supabase sync queue; Better Auth does not supply cloud Workout/Program sync.
3. Provision a controlled Better Auth server, PostgreSQL auth schema, transactional email, and preview Auth API environment before user-facing migration.
4. Obtain actual Android native acceptance evidence once M22.3's build/device blockers are cleared.

These are bounded, dependency-aware slices. No core GymFlow domain semantic needs to change.
