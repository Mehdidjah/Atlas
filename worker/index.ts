/// <reference types="@cloudflare/workers-types" />

import {
  consumeOAuthState,
  deleteMetaConnection,
  getPublicAccounts,
  getStoredConnection,
  insertOAuthState,
  pruneExpiredOAuthStates,
  saveMetaConnection,
  setSelectedAccounts,
} from './db';
import {
  createOAuthState,
  decryptToken,
  encryptToken,
  sha256Hex,
} from './crypto';
import {
  ApiError,
  asErrorResponse,
  json,
  noContent,
  parseJsonBody,
  requireSameOrigin,
} from './http';
import {
  META_SCOPES,
  buildAuthorizationUrl,
  completeTokenExchange,
  fetchMetaAdAccounts,
  fetchMetaProfile,
  getMetaConfig,
  getRedirectUri,
  requireMetaConfig,
  revokeMetaPermissions,
} from './meta';
import type { Env, MetaConfig, StoredConnection } from './types';
import {
  currentUser,
  handleAuthRequest,
  requireUser,
  requireWorkspaceAccess,
} from './auth';

const WORKSPACE_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const requireWorkspaceId = (url: URL) => {
  const workspaceId = url.searchParams.get('workspaceId')?.trim() ?? '';
  if (!WORKSPACE_PATTERN.test(workspaceId)) {
    throw new ApiError(400, 'invalid_workspace', 'Choose a valid workspace.');
  }
  return workspaceId;
};

const connectionPath = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/connections/meta`;

const redirectToConnection = (
  request: Request,
  returnTo: string,
  result: string,
  reason?: string,
) => {
  const url = new URL(returnTo, new URL(request.url).origin);
  url.searchParams.set('meta', result);
  if (reason) url.searchParams.set('reason', reason);
  return new Response(null, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store',
      Location: url.toString(),
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

const serializeConnection = (connection: StoredConnection) => {
  const expired = Boolean(
    connection.token_expires_at && connection.token_expires_at <= Date.now(),
  );
  return {
    id: connection.id,
    metaUserId: connection.meta_user_id,
    metaUserName: connection.meta_user_name,
    status: expired ? 'expired' : connection.status,
    scopes: JSON.parse(connection.scopes) as string[],
    tokenExpiresAt: connection.token_expires_at,
    lastSyncedAt: connection.last_synced_at,
    connectedAt: connection.created_at,
    updatedAt: connection.updated_at,
  };
};

const handleStatus = async (request: Request, env: Env) => {
  const user = await requireUser(request, env);
  const url = new URL(request.url);
  const workspaceId = requireWorkspaceId(url);
  await requireWorkspaceAccess(env, user, workspaceId);
  const config = getMetaConfig(env);
  const connection = await getStoredConnection(env.DB, user.id, workspaceId);
  const accounts = connection
    ? await getPublicAccounts(env.DB, connection.id)
    : [];
  return json({
    configured: Boolean(config),
    redirectUri: getRedirectUri(request, env),
    requiredPermissions: META_SCOPES,
    connection: connection ? serializeConnection(connection) : null,
    accounts: accounts.map((account) => ({
      metaAccountId: account.meta_account_id,
      accountId: account.account_id,
      name: account.name,
      accountStatus: account.account_status,
      currency: account.currency,
      timezoneName: account.timezone_name,
      businessId: account.business_id,
      businessName: account.business_name,
      selected: Boolean(account.selected),
    })),
  });
};

const handleConnect = async (request: Request, env: Env) => {
  const user = await requireUser(request, env);
  const config = requireMetaConfig(env);
  const url = new URL(request.url);
  const workspaceId = requireWorkspaceId(url);
  await requireWorkspaceAccess(env, user, workspaceId);
  const returnTo = connectionPath(workspaceId);
  const now = Date.now();
  const state = createOAuthState();
  const stateHash = await sha256Hex(state);
  await pruneExpiredOAuthStates(env.DB, now);
  await insertOAuthState(env.DB, {
    stateHash,
    userId: user.id,
    workspaceId,
    returnTo,
    expiresAt: now + OAUTH_STATE_TTL_MS,
    createdAt: now,
  });
  const authorizationUrl = buildAuthorizationUrl(
    config,
    getRedirectUri(request, env),
    state,
  );
  return new Response(null, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store',
      Location: authorizationUrl,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

const handleCallback = async (request: Request, env: Env) => {
  const user = await requireUser(request, env);
  const config = requireMetaConfig(env);
  const url = new URL(request.url);
  const rawState = url.searchParams.get('state');
  if (!rawState || rawState.length > 256) {
    throw new ApiError(
      400,
      'oauth_state_missing',
      'The OAuth state is missing.',
    );
  }
  const state = await consumeOAuthState(
    env.DB,
    await sha256Hex(rawState),
    user.id,
    Date.now(),
  );
  if (!state) {
    throw new ApiError(
      400,
      'oauth_state_invalid',
      'The connection request expired or has already been used.',
    );
  }
  await requireWorkspaceAccess(env, user, state.workspace_id);
  const expectedReturnTo = connectionPath(state.workspace_id);
  const returnTo =
    state.return_to === expectedReturnTo ? state.return_to : expectedReturnTo;
  if (url.searchParams.has('error')) {
    return redirectToConnection(request, returnTo, 'cancelled');
  }
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096) {
    return redirectToConnection(request, returnTo, 'error', 'missing_code');
  }

  try {
    const token = await completeTokenExchange(
      config,
      getRedirectUri(request, env),
      code,
    );
    const [profile, accounts] = await Promise.all([
      fetchMetaProfile(config, token.accessToken),
      fetchMetaAdAccounts(config, token.accessToken),
    ]);
    if (profile.id !== token.userId) {
      throw new ApiError(
        401,
        'meta_identity_mismatch',
        'Meta returned an unexpected account identity.',
      );
    }
    const encrypted = await encryptToken(
      token.accessToken,
      config.encryptionKey,
    );
    await saveMetaConnection(env.DB, {
      userId: user.id,
      workspaceId: state.workspace_id,
      metaUserId: token.userId,
      metaUserName: profile.name ?? null,
      tokenCiphertext: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenExpiresAt: token.expiresAt,
      scopes: token.scopes,
      accounts,
      now: Date.now(),
    });
    return redirectToConnection(request, returnTo, 'connected');
  } catch (error) {
    console.error('Meta OAuth callback failed', error);
    const reason = error instanceof ApiError ? error.code : 'connection_failed';
    return redirectToConnection(request, returnTo, 'error', reason);
  }
};

const readConnectionToken = async (
  connection: StoredConnection,
  config: MetaConfig,
) =>
  decryptToken(
    connection.token_ciphertext,
    connection.token_iv,
    config.encryptionKey,
  );

const handleRefresh = async (request: Request, env: Env) => {
  requireSameOrigin(request);
  const user = await requireUser(request, env);
  const config = requireMetaConfig(env);
  const workspaceId = requireWorkspaceId(new URL(request.url));
  await requireWorkspaceAccess(env, user, workspaceId);
  const connection = await getStoredConnection(env.DB, user.id, workspaceId);
  if (!connection) {
    throw new ApiError(404, 'connection_not_found', 'Connect Meta Ads first.');
  }
  const accessToken = await readConnectionToken(connection, config);
  const [profile, accounts] = await Promise.all([
    fetchMetaProfile(config, accessToken),
    fetchMetaAdAccounts(config, accessToken),
  ]);
  const encrypted = await encryptToken(accessToken, config.encryptionKey);
  await saveMetaConnection(env.DB, {
    userId: user.id,
    workspaceId,
    metaUserId: connection.meta_user_id,
    metaUserName: profile.name ?? connection.meta_user_name,
    tokenCiphertext: encrypted.ciphertext,
    tokenIv: encrypted.iv,
    tokenExpiresAt: connection.token_expires_at,
    scopes: JSON.parse(connection.scopes) as string[],
    accounts,
    now: Date.now(),
  });
  return json({ success: true, accountCount: accounts.length });
};

const handleSelectAccounts = async (request: Request, env: Env) => {
  requireSameOrigin(request);
  const user = await requireUser(request, env);
  const workspaceId = requireWorkspaceId(new URL(request.url));
  await requireWorkspaceAccess(env, user, workspaceId);
  const body = await parseJsonBody<{ accountIds?: unknown }>(request);
  if (
    !Array.isArray(body.accountIds) ||
    body.accountIds.length > 500 ||
    body.accountIds.some(
      (value) => typeof value !== 'string' || !/^act_\d+$/.test(value),
    )
  ) {
    throw new ApiError(
      400,
      'invalid_accounts',
      'Choose valid Meta ad accounts.',
    );
  }
  const connection = await getStoredConnection(env.DB, user.id, workspaceId);
  if (!connection) {
    throw new ApiError(404, 'connection_not_found', 'Connect Meta Ads first.');
  }
  const requested = [...new Set(body.accountIds as string[])];
  const available = await getPublicAccounts(env.DB, connection.id);
  const availableIds = new Set(
    available.map((account) => account.meta_account_id),
  );
  if (requested.some((accountId) => !availableIds.has(accountId))) {
    throw new ApiError(
      403,
      'account_not_available',
      'One or more ad accounts are not available to this connection.',
    );
  }
  await setSelectedAccounts(env.DB, connection.id, requested, Date.now());
  return json({ success: true, selectedCount: requested.length });
};

const handleDisconnect = async (request: Request, env: Env) => {
  requireSameOrigin(request);
  const user = await requireUser(request, env);
  const workspaceId = requireWorkspaceId(new URL(request.url));
  await requireWorkspaceAccess(env, user, workspaceId);
  const connection = await getStoredConnection(env.DB, user.id, workspaceId);
  if (!connection) return noContent();

  let revokedAtMeta = false;
  const config = getMetaConfig(env);
  if (config) {
    try {
      const accessToken = await readConnectionToken(connection, config);
      revokedAtMeta = await revokeMetaPermissions(config, accessToken);
    } catch (error) {
      console.warn(
        'Meta permission revocation failed; removing local data',
        error,
      );
    }
  }
  await deleteMetaConnection(env.DB, user.id, workspaceId);
  return json({ success: true, revokedAtMeta });
};

const handleApiRequest = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/auth/'))
    return handleAuthRequest(request, env);
  if (url.pathname === '/api/meta/status' && request.method === 'GET') {
    return handleStatus(request, env);
  }
  if (url.pathname === '/api/meta/connect' && request.method === 'GET') {
    return handleConnect(request, env);
  }
  if (url.pathname === '/api/meta/callback' && request.method === 'GET') {
    return handleCallback(request, env);
  }
  if (url.pathname === '/api/meta/refresh' && request.method === 'POST') {
    return handleRefresh(request, env);
  }
  if (
    url.pathname === '/api/meta/accounts/select' &&
    request.method === 'POST'
  ) {
    return handleSelectAccounts(request, env);
  }
  if (url.pathname === '/api/meta/connection' && request.method === 'DELETE') {
    return handleDisconnect(request, env);
  }
  throw new ApiError(404, 'not_found', 'API route not found.');
};

const serveApp = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const acceptsHtml = (request.headers.get('accept') || '').includes(
    'text/html',
  );
  if (request.method === 'GET' && acceptsHtml) {
    const isAuthScreen =
      url.pathname === '/sign-in' || url.pathname === '/sign-up';
    const user = await currentUser(request, env);
    const isDemo = /^\/workspaces\/demo(?:\/|$)/.test(url.pathname);
    if (!isAuthScreen && url.pathname !== '/' && !isDemo && !user) {
      const signInUrl = new URL('/sign-in', url.origin);
      signInUrl.searchParams.set('returnTo', `${url.pathname}${url.search}`);
      return new Response(null, {
        status: 302,
        headers: {
          'Cache-Control': 'no-store',
          Location: signInUrl.toString(),
          'Referrer-Policy': 'no-referrer',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    const workspace = /^\/workspaces\/([a-zA-Z0-9_-]{1,80})(?:\/|$)/.exec(
      url.pathname,
    );
    if (user && workspace && !isDemo)
      await requireWorkspaceAccess(env, user, workspace[1]);
    return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
  }
  return env.ASSETS.fetch(request);
};

export default {
  async fetch(request, env) {
    try {
      if (new URL(request.url).pathname.startsWith('/api/')) {
        return await handleApiRequest(request, env);
      }
      return await serveApp(request, env);
    } catch (error) {
      return asErrorResponse(error);
    }
  },
} satisfies ExportedHandler<Env>;
