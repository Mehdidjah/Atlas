import { createOAuthState, sha256Hex } from './crypto';
import { ApiError, json, requireSameOrigin } from './http';
import {
  exchangeIdentity,
  providerAuthorizationUrl,
  providerConfig,
} from './auth-providers';
import {
  consumeLoginState,
  createSession,
  getOrCreateIdentity,
  memberships,
  sessionUser,
} from './auth-store';
import {
  authorizedReturnTo,
  configuredOrigin,
  cookie,
  hostedAuthEnabled,
  isProvider,
  opaqueToken,
  readCookie,
  safeReturnTo,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  STATE_TTL_SECONDS,
  stateCookie,
  type IdentityProvider,
} from './auth-security';
import type { AuthenticatedUser, Env } from './types';

const authRedirect = (location: string, cookies: string[] = []) => {
  const headers = new Headers({
    Location: location,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
};
export const currentUser = async (
  request: Request,
  env: Env,
): Promise<AuthenticatedUser | null> => {
  const raw = readCookie(request, SESSION_COOKIE);
  if (opaqueToken(raw)) {
    const user = await sessionUser(env.DB, await sha256Hex(raw), Date.now());
    if (user) return { ...user, source: 'session' };
  }
  // The flag is OFF by default. Public Workers MUST NOT enable this unless an
  // exclusive trusted ingress strips browser-supplied headers and injects its own.
  if (hostedAuthEnabled(env)) {
    const id = request.headers.get('oai-authenticated-user-id')?.trim();
    if (id && id.length <= 255)
      return {
        id,
        name: request.headers.get('oai-authenticated-user-name'),
        email: request.headers.get('oai-authenticated-user-email'),
        defaultWorkspaceId: 'demo',
        source: 'hosted',
      };
  }
  return null;
};
export const requireUser = async (request: Request, env: Env) => {
  const user = await currentUser(request, env);
  if (!user)
    throw new ApiError(
      401,
      'authentication_required',
      'Sign in to Aster before connecting Meta Ads.',
    );
  return user;
};
export const requireWorkspaceAccess = async (
  env: Env,
  user: AuthenticatedUser,
  workspaceId: string,
) => {
  if (user.source === 'hosted' && hostedAuthEnabled(env)) return;
  const member = await env.DB.prepare(
    'SELECT role FROM auth_workspace_members WHERE user_id = ? AND workspace_id = ?',
  )
    .bind(user.id, workspaceId)
    .first();
  if (!member)
    throw new ApiError(
      403,
      'workspace_forbidden',
      'You do not have access to this workspace.',
    );
};
const start = async (
  request: Request,
  env: Env,
  provider: IdentityProvider,
) => {
  const config = providerConfig(env, provider);
  if (!config)
    throw new ApiError(
      503,
      'provider_unavailable',
      'This sign-in provider is not configured. Explore the demo or contact the administrator.',
    );
  if (new URL(request.url).origin !== configuredOrigin(env))
    throw new ApiError(
      403,
      'invalid_origin',
      'Use the configured Aster sign-in address.',
    );
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
  const state = createOAuthState();
  const browserToken = createOAuthState();
  const verifier = createOAuthState();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_oauth_states WHERE expires_at <= ?').bind(
      now,
    ),
    env.DB.prepare(
      'DELETE FROM auth_sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL',
    ).bind(now),
    env.DB.prepare(
      'INSERT INTO auth_oauth_states (state_hash, browser_hash, provider, return_to, pkce_verifier, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      await sha256Hex(state),
      await sha256Hex(browserToken),
      provider,
      returnTo,
      verifier,
      now + STATE_TTL_SECONDS * 1000,
      now,
    ),
  ]);
  return authRedirect(await providerAuthorizationUrl(config, state, verifier), [
    cookie(stateCookie(provider), browserToken, STATE_TTL_SECONDS),
  ]);
};
const callback = async (
  request: Request,
  env: Env,
  provider: IdentityProvider,
) => {
  const clear = cookie(stateCookie(provider), '', 0);
  const failure = (reason: string) =>
    authRedirect(`/sign-in?authError=${reason}`, [clear]);
  const config = providerConfig(env, provider);
  if (!config) return failure('provider_unavailable');
  if (new URL(request.url).origin !== configuredOrigin(env))
    return failure('invalid_state');
  const url = new URL(request.url);
  const rawState = url.searchParams.get('state');
  const browserToken = readCookie(request, stateCookie(provider));
  if (
    !opaqueToken(rawState) ||
    !opaqueToken(browserToken) ||
    url.searchParams.getAll('state').length !== 1
  )
    return failure('invalid_state');
  try {
    const state = await consumeLoginState(
      env.DB,
      await sha256Hex(rawState),
      await sha256Hex(browserToken),
      provider,
      Date.now(),
    );
    if (!state) return failure('invalid_state');
    const failedReturn = (reason: string) =>
      authRedirect(
        `/sign-in?${new URLSearchParams({ authError: reason, ...(state.return_to ? { returnTo: state.return_to } : {}) })}`,
        [clear],
      );
    if (url.searchParams.has('error'))
      return failedReturn(
        url.searchParams.get('error') === 'access_denied'
          ? 'cancelled'
          : 'provider_failed',
      );
    const code = url.searchParams.get('code');
    if (
      !code ||
      code.length > 4096 ||
      url.searchParams.getAll('code').length !== 1
    )
      return failedReturn('provider_failed');
    const identity = await exchangeIdentity(config, code, state.pkce_verifier);
    const user = await getOrCreateIdentity(
      env.DB,
      provider,
      identity,
      Date.now(),
    );
    const workspaces = await memberships(env.DB, user.id);
    if (
      !workspaces.some((workspace) => workspace.id === user.defaultWorkspaceId)
    )
      return failedReturn('workspace_unavailable');
    const previous = readCookie(request, SESSION_COOKIE);
    const token = await createSession(
      env.DB,
      user.id,
      Date.now(),
      opaqueToken(previous) ? await sha256Hex(previous) : null,
    );
    return authRedirect(
      authorizedReturnTo(
        state.return_to,
        user.defaultWorkspaceId,
        workspaces.map((workspace) => workspace.id),
      ),
      [clear, cookie(SESSION_COOKIE, token, SESSION_TTL_SECONDS)],
    );
  } catch {
    // Never expose/log the provider response, authorization code or token.
    return failure('provider_failed');
  }
};
export const handleAuthRequest = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  const url = new URL(request.url);
  if (url.pathname === '/api/auth/providers' && request.method === 'GET') {
    const canonical = configuredOrigin(env) === url.origin;
    return json({
      google: canonical && Boolean(providerConfig(env, 'google')),
      facebook: canonical && Boolean(providerConfig(env, 'facebook')),
      hosted: hostedAuthEnabled(env),
    });
  }
  if (url.pathname === '/api/auth/session' && request.method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return json({ user: null, workspaces: [] });
    const workspaces =
      user.source === 'session'
        ? await memberships(env.DB, user.id)
        : [{ id: 'demo', name: 'Hosted workspace', role: 'owner' }];
    return json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        defaultWorkspaceId: user.defaultWorkspaceId,
      },
      workspaces,
    });
  }
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    requireSameOrigin(request);
    const raw = readCookie(request, SESSION_COOKIE);
    if (opaqueToken(raw))
      await env.DB.prepare(
        'UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?',
      )
        .bind(Date.now(), await sha256Hex(raw))
        .run();
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    for (const name of [
      SESSION_COOKIE,
      stateCookie('google'),
      stateCookie('facebook'),
    ])
      headers.append('Set-Cookie', cookie(name, '', 0));
    if (
      hostedAuthEnabled(env) &&
      request.headers.get('oai-authenticated-user-id')?.trim()
    )
      return json(
        {
          error: {
            code: 'hosted_logout_required',
            message:
              'The Aster cookie session was revoked. Sign out through the trusted hosting platform to end its separate hosted session.',
          },
        },
        { status: 409, headers },
      );
    return new Response(null, { status: 204, headers });
  }
  const match = /^\/api\/auth\/([^/]+)\/(start|callback)$/.exec(url.pathname);
  if (match && isProvider(match[1]) && request.method === 'GET')
    return match[2] === 'start'
      ? start(request, env, match[1])
      : callback(request, env, match[1]);
  throw new ApiError(404, 'not_found', 'Authentication route not found.');
};
