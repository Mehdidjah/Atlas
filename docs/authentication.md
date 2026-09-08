# Aster account authentication

Aster account identity and Meta advertising permissions are **separate flows**. A customer signs in with Google or Facebook, gets a personal workspace, then connects their own Meta ad accounts through the existing `/api/meta/*` flow. Signing in with Facebook requests only `public_profile,email`, not advertising permissions. No campaign-write endpoint is added.

## Deployment prerequisites

Production OAuth is **blocked until the administrator configures the providers, runtime variables and D1 migration**. No provider console changes, deployment, or persistent database migration were performed by this implementation. Configured booleans indicate presence/shape of configuration, not completed provider review or a successful live login.

Set values on the **Worker server**, never in a `VITE_*` variable, frontend bundle, committed configuration, or source control:

| Environment name              | Required             | Purpose                                                                                                |
| ----------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `DB`                          | Yes                  | Existing D1 binding; both existing Meta and new auth tables                                            |
| `ASSETS`                      | Yes                  | Existing static asset binding                                                                          |
| `AUTH_ORIGIN`                 | For identity login   | Canonical HTTPS origin, e.g. `https://your-aster.example`; no path/query/fragment, credentials or HTTP |
| `AUTH_GOOGLE_CLIENT_ID`       | For Google           | Google OAuth **Web application** client ID                                                             |
| `AUTH_GOOGLE_CLIENT_SECRET`   | For Google, secret   | Server code-exchange client secret                                                                     |
| `AUTH_FACEBOOK_APP_ID`        | For Facebook         | Facebook Login app ID for Aster identity                                                               |
| `AUTH_FACEBOOK_APP_SECRET`    | For Facebook, secret | Server code exchange, token inspection and proof                                                       |
| `AUTH_FACEBOOK_GRAPH_VERSION` | Optional             | Defaults to `v26.0`; valid `vN.N` version supported by your app                                        |
| `AUTH_TRUST_HOST_HEADERS`     | Optional, dangerous  | Defaults off. Only the exact string `true` enables the legacy trusted-host adapter                     |

Register **exact** callback URLs with the corresponding provider:

- Google: `${AUTH_ORIGIN}/api/auth/google/callback`
- Facebook: `${AUTH_ORIGIN}/api/auth/facebook/callback`

Enable/configure the appropriate Google consent screen and Facebook Login product, HTTPS domains, valid redirect URIs, privacy/data-deletion settings and any provider review requirements. Use distinct identity credentials where practical. A Facebook identity app change changes app-scoped subjects; do not assume identities transfer across apps. Existing `META_APP_ID`, `META_APP_SECRET`, `META_TOKEN_ENCRYPTION_KEY`, `META_GRAPH_VERSION`, `META_REDIRECT_URI` and `META_LOGIN_CONFIG_ID` keep their existing meanings. Identity configuration does not configure the Meta Ads integration.

### Migration

New additive migration: `drizzle/0001_aster_identity.sql`, after `drizzle/0000_powerful_sphinx.sql`.

Tables: `auth_users`, `auth_identities`, `auth_workspaces`, `auth_workspace_members`, `auth_sessions`, `auth_oauth_states`. The Drizzle declarations are in `db/schema.ts`. Existing Meta tables and encrypted data are not rewritten. This migration was generated from the Drizzle schema. The generation journal and `drizzle/meta/0001_snapshot.json` are aligned, so subsequent schema generation does not repeat these tables. Use the existing deployment's D1 SQL migration process. Apply only after backup/review, to the intended D1 database. No automatic application occurs at startup.

## API and frontend contracts

All API responses are same-origin and uncached. No tokens or secrets appear in these contracts.

- `GET /api/auth/providers` → `{ google: boolean, facebook: boolean, hosted: boolean }`. Google/Facebook require valid canonical HTTPS origin matching the request, D1 binding and the corresponding configured credentials. `hosted` is only true with the explicit trust flag.
- `GET /api/auth/session` → `{ user: { id, name, email, defaultWorkspaceId } | null, workspaces: Array<{ id, name, role }> }`. Name/email can be null. Anonymous users get `user: null, workspaces: []`.
- `GET /api/auth/google/start?returnTo=...` and `GET /api/auth/facebook/start?returnTo=...`: begin real server-side authorization-code login. Unconfigured providers return 503 `provider_unavailable`; never a fake authenticated result.
- `GET /api/auth/{google|facebook}/callback`: consume state, exchange code, verify identity, create/reuse identity and workspace, rotate Aster session, then redirect. Failures redirect to `/sign-in?authError=...` with a fixed, non-sensitive reason.
- `POST /api/auth/logout`: requires matching `Origin`, revokes the presented D1 session and clears session/OAuth cookies, returns 204. Legacy hosted identity must also be ended by the hosting platform; in that case this endpoint returns 409 `hosted_logout_required` after revoking any Aster session, rather than falsely claiming the host identity is signed out.

`src/lib/auth-api.ts` exports:

```ts
type AuthProvider = 'google' | 'facebook';
authApi.providers(): Promise<AuthProviders>;
authApi.session(): Promise<AuthSession>;
authApi.startUrl(provider: AuthProvider, returnTo?: string): string;
authApi.signOut(): Promise<void>;
safeAuthReturnTo(value: unknown): string | undefined;
```

The `/sign-in` and `/sign-up` components retain `SignInPage` and `SignUpPage` exports. Routing is owned by the application router. It must support `/workspaces/:workspaceId/connections` as the default post-login destination, with `/` routed to `/sign-in`, and retain the existing `/connections/meta` route. UI callback messages read `authError` directly from the browser URL so router search-schema changes are not required. Parent routing can optionally validate and retain `authError`.

## Security design

- Identity key is the unique `(provider, immutable subject)` pair. Missing/empty/invalid subjects are rejected. Email is informational and deliberately non-unique: two providers with the same email create separate users. No automatic account linking, invitation, recovery, merge or email-based permission inference.
- Google uses S256 PKCE, a confidential server code exchange, and the fixed HTTPS Google OpenID Connect UserInfo endpoint using only the access token obtained by that exchange. **ID tokens are not parsed or trusted**. This is the verified-UserInfo alternative to local OIDC JWT/nonce verification. No frontend token is accepted. Google scopes are `openid email profile`.
- Facebook exchanges the code server-side, verifies `debug_token` validity, app ID, subject and expiry, fetches `/me` with `appsecret_proof`, and requires its subject to match the inspected token. Tokens are transient and not stored for identity login. Advertising tokens continue using the existing AES-256-GCM storage and Meta contracts unchanged.
- Session tokens and OAuth state are 32 cryptographically random bytes. D1 stores SHA-256 hashes, never raw session/state tokens. The browser-binding token is also hashed. The Google PKCE verifier must be retained server-side in the short-lived state row until exchange; no identity client secret or access token is stored there.
- OAuth state lives for 10 minutes, is bound to provider and a separate browser HttpOnly cookie, and is atomically single-use via `DELETE ... WHERE expires_at > now RETURNING`. Cancellation consumes state too. One pending login per provider per browser is supported; starting another invalidates the earlier browser binding.
- Cookies: `__Host-aster-session`, `__Host-aster-oauth-google`, `__Host-aster-oauth-facebook`, all `Path=/; HttpOnly; Secure; SameSite=Lax`, no Domain. Duplicate cookie names fail closed. Sessions expire absolutely after seven days, checked on every request, with database revocation and rotation on login. Expired state/session rows are pruned on new login starts. Logout also clears pending browser-binding cookies.
- Return destinations must match an explicit workspace-route allowlist, max 500 characters. Authorities, backslashes, escapes (including encoded/double-encoded separators), fragments, controls, whitespace and dot-segments are rejected, not normalized. Queries allow only a conservative character set. After login, the target workspace must be a real membership; unauthorized, absent, invalid and demo destinations go to the user's personal `/connections`. Demo returnTo never enrolls a customer in the demo workspace. Safe authorized non-demo paths are preserved.
- Every local-session Meta endpoint requires real workspace membership, including the callback's stored workspace. Existing connection access remains scoped by **both user and workspace**. Same-origin mutation requirements stay in place. Personal workspace creation is transactional with identity creation; the unique identity index arbitrates concurrent first logins without orphan accounts.
- Provider URLs are hardcoded HTTPS destinations, redirects from upstream fetches are rejected, and outbound identity calls time out after 15 seconds. Provider response bodies, codes, tokens and secrets are never included in application logs/errors. Disable URL/query logging for OAuth callbacks and upstream calls at your observability layer, especially Facebook's server-side exchange and debug-token request.

### Hosted compatibility trust boundary

This document supersedes the unconditional hosted-header assumption in the older `docs/meta-ads-oauth.md` SaaS-access section. By default **all `oai-authenticated-user-*` headers are ignored**, including on public Workers. Setting `AUTH_TRUST_HOST_HEADERS=true` is safe only if an exclusive, authenticated hosting ingress strips all incoming copies of those headers and injects verified identity, and direct/public Worker origins cannot bypass that ingress. Do not enable it merely because the headers exist.

The legacy adapter preserves the existing hosted user IDs and original user/workspace-scoped Meta records. It does not claim local D1 memberships for legacy host users, whose access remains governed by that trusted ingress. Its session response uses a compatibility `demo` workspace and does not perform account migration/linking. Local Google/Facebook sessions **always** require D1 membership, even with the hosted flag enabled. Migrate hosted identities through a separately reviewed process, not by matching email. Host sign-out is outside Aster's cookie-session control.

## Local preview and tests

Vite dev **and preview** return all providers false, an anonymous session, and 503 for provider start/callback paths. Logout is an anonymous no-op. The existing local Meta status mock, sites plugin, Tailwind, polling and build configuration are preserved. Local Vite intentionally cannot authenticate and never reads provider secrets.

Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run lint`. Security tests use bundled source and an **in-memory SQLite test database**, not a configured D1 database, real provider or credentials.

Before production acceptance, test both live providers on the canonical HTTPS deployment: new user, repeat user, same-email/different-provider isolation, cancellation, expired/replayed state, wrong browser, missing subject, unauthorized workspace, expiry, logout, and independent Meta Ads connection. Automated tests cannot validate provider-console configuration, app review, hosting header sanitation or real customer permissions. Add ingress rate limits/abuse monitoring, privacy lifecycle/deletion, key/secret rotation procedures, operational session cleanup and an account-recovery/linking design before a broader public launch. No campaign mutation or ad-token scope expansion is part of this change.
