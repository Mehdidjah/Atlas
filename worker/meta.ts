/// <reference types="@cloudflare/workers-types" />

import { createAppSecretProof } from './crypto';
import { ApiError } from './http';
import type { Env, MetaAdAccount, MetaConfig, MetaTokenDetails } from './types';

export const META_SCOPES = [
  'ads_read',
  'ads_management',
  'business_management',
] as const;

const DEFAULT_GRAPH_VERSION = 'v26.0';

interface GraphErrorBody {
  error?: {
    code?: number;
    error_subcode?: number;
    message?: string;
    type?: string;
  };
}

const readGraphBody = async <T>(response: Response): Promise<T> => {
  let body: (T & GraphErrorBody) | null = null;
  try {
    body = (await response.json()) as T & GraphErrorBody;
  } catch {
    // Meta occasionally returns a non-JSON gateway response.
  }
  if (!response.ok || body?.error) {
    console.error('Meta Graph API error', {
      status: response.status,
      code: body?.error?.code,
      subcode: body?.error?.error_subcode,
      type: body?.error?.type,
    });
    const expired = body?.error?.code === 190;
    throw new ApiError(
      expired ? 401 : 502,
      expired ? 'meta_token_expired' : 'meta_api_error',
      expired
        ? 'The Meta authorization has expired. Reconnect the account.'
        : 'Meta could not complete the request. Please try again.',
    );
  }
  if (!body) {
    throw new ApiError(
      502,
      'meta_invalid_response',
      'Meta returned an invalid response. Please try again.',
    );
  }
  return body;
};

export const getMetaConfig = (env: Env): MetaConfig | null => {
  const appId = env.META_APP_ID?.trim();
  const appSecret = env.META_APP_SECRET?.trim();
  const encryptionKey = env.META_TOKEN_ENCRYPTION_KEY?.trim();
  if (!appId || !appSecret || !encryptionKey) return null;
  const graphVersion = env.META_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    throw new Error('META_GRAPH_VERSION must look like v26.0.');
  }
  return {
    appId,
    appSecret,
    encryptionKey,
    graphVersion,
    loginConfigId: env.META_LOGIN_CONFIG_ID?.trim() || undefined,
  };
};

export const requireMetaConfig = (env: Env) => {
  const config = getMetaConfig(env);
  if (!config) {
    throw new ApiError(
      503,
      'meta_not_configured',
      'Meta credentials have not been configured for this deployment.',
    );
  }
  return config;
};

export const getRedirectUri = (request: Request, env: Env) =>
  env.META_REDIRECT_URI?.trim() ||
  `${new URL(request.url).origin}/api/meta/callback`;

export const buildAuthorizationUrl = (
  config: MetaConfig,
  redirectUri: string,
  state: string,
) => {
  const url = new URL(
    `https://www.facebook.com/${config.graphVersion}/dialog/oauth`,
  );
  url.searchParams.set('client_id', config.appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', META_SCOPES.join(','));
  url.searchParams.set('auth_type', 'rerequest');
  if (config.loginConfigId) {
    url.searchParams.set('config_id', config.loginConfigId);
  }
  return url.toString();
};

const exchangeCode = async (
  config: MetaConfig,
  redirectUri: string,
  code: string,
) => {
  const url = new URL(
    `https://graph.facebook.com/${config.graphVersion}/oauth/access_token`,
  );
  url.searchParams.set('client_id', config.appId);
  url.searchParams.set('client_secret', config.appSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);
  const response = await fetch(url, { method: 'GET' });
  return readGraphBody<{ access_token: string; expires_in?: number }>(response);
};

const exchangeLongLivedToken = async (
  config: MetaConfig,
  shortLivedToken: string,
) => {
  const url = new URL(
    `https://graph.facebook.com/${config.graphVersion}/oauth/access_token`,
  );
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', config.appId);
  url.searchParams.set('client_secret', config.appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);
  const response = await fetch(url, { method: 'GET' });
  return readGraphBody<{ access_token: string; expires_in?: number }>(response);
};

const inspectToken = async (config: MetaConfig, accessToken: string) => {
  const url = new URL(
    `https://graph.facebook.com/${config.graphVersion}/debug_token`,
  );
  url.searchParams.set('input_token', accessToken);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.appId}|${config.appSecret}` },
  });
  return readGraphBody<{
    data: {
      app_id?: string;
      expires_at?: number;
      is_valid?: boolean;
      scopes?: string[];
      user_id?: string;
    };
  }>(response);
};

export const completeTokenExchange = async (
  config: MetaConfig,
  redirectUri: string,
  code: string,
): Promise<MetaTokenDetails> => {
  const shortLived = await exchangeCode(config, redirectUri, code);
  const longLived = await exchangeLongLivedToken(
    config,
    shortLived.access_token,
  );
  const inspection = await inspectToken(config, longLived.access_token);
  const data = inspection.data;
  if (!data.is_valid || data.app_id !== config.appId || !data.user_id) {
    throw new ApiError(
      401,
      'meta_token_invalid',
      'Meta returned an invalid authorization. Please reconnect.',
    );
  }
  const scopes = data.scopes ?? [];
  const missing = META_SCOPES.filter((scope) => !scopes.includes(scope));
  if (missing.length) {
    throw new ApiError(
      403,
      'meta_permissions_missing',
      `Meta did not grant the required permissions: ${missing.join(', ')}.`,
    );
  }
  const expiresAt = data.expires_at
    ? data.expires_at * 1000
    : longLived.expires_in
      ? Date.now() + longLived.expires_in * 1000
      : null;
  return {
    accessToken: longLived.access_token,
    expiresAt,
    scopes,
    userId: data.user_id,
  };
};

const graphGet = async <T>(
  config: MetaConfig,
  accessToken: string,
  path: string,
  params: Record<string, string> = {},
) => {
  const url = new URL(
    `https://graph.facebook.com/${config.graphVersion}${path}`,
  );
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set(
    'appsecret_proof',
    await createAppSecretProof(accessToken, config.appSecret),
  );
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return readGraphBody<T>(response);
};

export const fetchMetaProfile = (config: MetaConfig, accessToken: string) =>
  graphGet<{ id: string; name?: string }>(config, accessToken, '/me', {
    fields: 'id,name',
  });

export const fetchMetaAdAccounts = async (
  config: MetaConfig,
  accessToken: string,
) => {
  const accounts: MetaAdAccount[] = [];
  let after: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const result = await graphGet<{
      data?: MetaAdAccount[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(config, accessToken, '/me/adaccounts', {
      fields:
        'id,account_id,name,account_status,currency,timezone_name,business{id,name}',
      limit: '200',
      ...(after ? { after } : {}),
    });
    accounts.push(...(result.data ?? []));
    const nextAfter = result.paging?.next
      ? result.paging.cursors?.after
      : undefined;
    if (!nextAfter || nextAfter === after) break;
    after = nextAfter;
  }
  return accounts;
};

export const revokeMetaPermissions = async (
  config: MetaConfig,
  accessToken: string,
) => {
  const url = new URL(
    `https://graph.facebook.com/${config.graphVersion}/me/permissions`,
  );
  url.searchParams.set(
    'appsecret_proof',
    await createAppSecretProof(accessToken, config.appSecret),
  );
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return false;
  const body = await response
    .json()
    .then((value) => value as { success?: boolean })
    .catch(() => null);
  return body?.success === true;
};
