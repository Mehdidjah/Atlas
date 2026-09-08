import { createAppSecretProof } from './crypto';
import { ApiError } from './http';
import {
  configuredOrigin,
  pkceChallenge,
  type IdentityProvider,
} from './auth-security';
import type { Env } from './types';

export interface ProviderConfig {
  provider: IdentityProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  graphVersion: string;
}
export interface ProviderIdentity {
  subject: string;
  name: string | null;
  email: string | null;
}
export const providerConfig = (
  env: Env,
  provider: IdentityProvider,
): ProviderConfig | null => {
  const origin = configuredOrigin(env);
  const clientId = (
    provider === 'google' ? env.AUTH_GOOGLE_CLIENT_ID : env.AUTH_FACEBOOK_APP_ID
  )?.trim();
  const clientSecret = (
    provider === 'google'
      ? env.AUTH_GOOGLE_CLIENT_SECRET
      : env.AUTH_FACEBOOK_APP_SECRET
  )?.trim();
  const graphVersion = env.AUTH_FACEBOOK_GRAPH_VERSION?.trim() || 'v26.0';
  if (
    !origin ||
    !clientId ||
    !clientSecret ||
    !env.DB ||
    (provider === 'facebook' && !/^v\d+\.\d+$/.test(graphVersion))
  )
    return null;
  return {
    provider,
    clientId,
    clientSecret,
    redirectUri: `${origin}/api/auth/${provider}/callback`,
    graphVersion,
  };
};
export const providerAuthorizationUrl = async (
  config: ProviderConfig,
  state: string,
  verifier: string,
) => {
  const url = new URL(
    config.provider === 'google'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : `https://www.facebook.com/${config.graphVersion}/dialog/oauth`,
  );
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state,
    scope:
      config.provider === 'google'
        ? 'openid email profile'
        : 'public_profile,email',
  }).toString();
  if (config.provider === 'google') {
    url.searchParams.set('code_challenge', await pkceChallenge(verifier));
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return url.toString();
};
const providerFailure = () =>
  new ApiError(
    502,
    'provider_response_invalid',
    'The identity provider could not verify your account. Please try again.',
  );
// Fetch only hardcoded HTTPS provider endpoints. Never log payloads, codes or tokens.
const providerJson = async (
  url: string | URL,
  init: RequestInit = {},
): Promise<Record<string, unknown>> => {
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw providerFailure();
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    'error' in body
  )
    throw providerFailure();
  return body as Record<string, unknown>;
};
const requiredSubject = (value: unknown) => {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 255 ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw providerFailure();
  return value;
};
export const identityFromProfile = (
  provider: IdentityProvider,
  profile: Record<string, unknown>,
): ProviderIdentity => ({
  subject: requiredSubject(provider === 'google' ? profile.sub : profile.id),
  name: typeof profile.name === 'string' ? profile.name.slice(0, 200) : null,
  // Informational only. Never an identity key, linking key or authorization input.
  email: typeof profile.email === 'string' ? profile.email.slice(0, 320) : null,
});
export const exchangeIdentity = async (
  config: ProviderConfig,
  code: string,
  verifier: string,
): Promise<ProviderIdentity> => {
  let token: Record<string, unknown>;
  if (config.provider === 'google') {
    token = await providerJson('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      }).toString(),
    });
  } else {
    const url = new URL(
      `https://graph.facebook.com/${config.graphVersion}/oauth/access_token`,
    );
    url.search = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }).toString();
    token = await providerJson(url);
  }
  if (
    typeof token.access_token !== 'string' ||
    !token.access_token ||
    token.access_token.length > 16_000 ||
    typeof token.token_type !== 'string' ||
    token.token_type.toLowerCase() !== 'bearer' ||
    typeof token.expires_in !== 'number' ||
    token.expires_in <= 0
  )
    throw providerFailure();
  const headers = { Authorization: `Bearer ${token.access_token}` };
  if (config.provider === 'google') {
    // Deliberately do not parse/trust id_token. Identity comes from Google's fixed
    // TLS UserInfo endpoint using ONLY the server-exchanged PKCE-bound access token.
    return identityFromProfile(
      'google',
      await providerJson('https://openidconnect.googleapis.com/v1/userinfo', {
        headers,
      }),
    );
  }
  const debugUrl = new URL(
    `https://graph.facebook.com/${config.graphVersion}/debug_token`,
  );
  debugUrl.searchParams.set('input_token', token.access_token);
  const inspection = await providerJson(debugUrl, {
    headers: {
      Authorization: `Bearer ${config.clientId}|${config.clientSecret}`,
    },
  });
  const data = inspection.data as Record<string, unknown> | undefined;
  const now = Date.now() / 1000;
  if (
    !data ||
    data.is_valid !== true ||
    data.app_id !== config.clientId ||
    typeof data.expires_at !== 'number' ||
    data.expires_at <= now ||
    (typeof data.data_access_expires_at === 'number' &&
      data.data_access_expires_at > 0 &&
      data.data_access_expires_at <= now)
  )
    throw providerFailure();
  const url = new URL(`https://graph.facebook.com/${config.graphVersion}/me`);
  url.searchParams.set('fields', 'id,name,email');
  url.searchParams.set(
    'appsecret_proof',
    await createAppSecretProof(token.access_token, config.clientSecret),
  );
  const identity = identityFromProfile(
    'facebook',
    await providerJson(url, { headers }),
  );
  if (identity.subject !== requiredSubject(data.user_id))
    throw providerFailure();
  return identity;
};
