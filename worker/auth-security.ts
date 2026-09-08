import type { Env } from './types';

export type IdentityProvider = 'google' | 'facebook';
export const SESSION_COOKIE = '__Host-aster-session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const STATE_TTL_SECONDS = 10 * 60;
export const isProvider = (value: string): value is IdentityProvider =>
  value === 'google' || value === 'facebook';
export const stateCookie = (provider: IdentityProvider) =>
  `__Host-aster-oauth-${provider}`;
export const opaqueToken = (value: string | null): value is string =>
  value !== null && /^[A-Za-z0-9_-]{43}$/.test(value);

// No decoding/normalizing attacker-controlled paths. Percent escapes, backslashes,
// authority paths, dot segments and controls are rejected before URL parsing.
export const safeReturnTo = (value: unknown): string | null => {
  if (
    typeof value !== 'string' ||
    value.length > 500 ||
    /[\\%#\s]/.test(value) ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return null;
  if (
    !/^\/workspaces\/[A-Za-z0-9_-]{1,80}\/(?:overview(?:\/chat\/[A-Za-z0-9_-]{1,80})?|connections(?:\/meta)?|performance(?:\/(?:rules|analyze|launch|activity))?|assistant|stage)(?:\?[A-Za-z0-9_=&+.,:-]*)?$/.test(
      value,
    )
  )
    return null;
  return value;
};
export const returnWorkspace = (value: string) => value.split('/')[2];
export const workspaceConnections = (id: string) =>
  `/workspaces/${encodeURIComponent(id)}/connections`;
export const authorizedReturnTo = (
  value: string | null,
  defaultId: string,
  workspaceIds: string[],
) => {
  const safe = safeReturnTo(value);
  if (
    !safe ||
    returnWorkspace(safe) === 'demo' ||
    !workspaceIds.includes(returnWorkspace(safe))
  )
    return workspaceConnections(defaultId);
  return safe;
};
export const cookie = (name: string, value: string, seconds: number) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
export const readCookie = (request: Request, name: string): string | null => {
  const matches = (request.headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  // Duplicate cookie names are ambiguous. Fail closed instead of picking one.
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
};
export const configuredOrigin = (env: Env): string | null => {
  try {
    const value = env.AUTH_ORIGIN?.trim();
    if (!value) return null;
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
      ? url.origin
      : null;
  } catch {
    return null;
  }
};
export const hostedAuthEnabled = (env: Env) =>
  env.AUTH_TRUST_HOST_HEADERS === 'true';
export const pkceChallenge = async (verifier: string) => {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
  );
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};
