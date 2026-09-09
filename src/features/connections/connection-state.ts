import { useEffect, useState } from 'react';
import type { MetaConnectionStatus } from '@/src/lib/types';
import { MetaApiError } from '@/src/lib/meta-api';

export const isAuthenticationRequired = (error: unknown) =>
  error instanceof MetaApiError &&
  error.code !== 'meta_token_expired' &&
  (error.status === 401 || error.code === 'authentication_required');
export const isTokenExpiredError = (error: unknown) =>
  error instanceof MetaApiError && error.code === 'meta_token_expired';
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';
export const metaReturnTo = (workspaceId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/connections/meta`;

export function connectionState(
  data: MetaConnectionStatus | undefined,
  now = Date.now(),
) {
  const connection = data?.connection;
  const expired = Boolean(
    connection &&
    (connection.status === 'expired' ||
      (connection.tokenExpiresAt !== null && connection.tokenExpiresAt <= now)),
  );
  const active = Boolean(
    data?.configured && connection?.status === 'active' && !expired,
  );
  const selectedCount =
    data?.accounts.filter((account) => account.selected).length ?? 0;
  return { active, expired, selectedCount, ready: active && selectedCount > 0 };
}

// Update at expiry even if the user leaves this screen open without interacting.
export function useConnectionState(data: MetaConnectionStatus | undefined) {
  const [now, setNow] = useState(Date.now);
  const expiresAt = data?.connection?.tokenExpiresAt;
  useEffect(() => {
    if (expiresAt == null || expiresAt <= now) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Math.min(expiresAt - Date.now() + 20, 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [expiresAt, now]);
  return connectionState(data, now);
}

export function callbackMessage(meta?: string, reason?: string) {
  if (meta === 'connected')
    return 'Returned from Facebook. Checking your authorization and ad accounts below.';
  if (meta === 'cancelled')
    return 'Facebook authorization was cancelled. You can try connecting again when you are ready.';
  if (meta !== 'error') return null;
  const reasons: Record<string, string> = {
    missing_code:
      'Facebook did not return an authorization code. Please try connecting again.',
    oauth_state_invalid:
      'This connection request expired or was already used. Start a new connection.',
    oauth_state_missing:
      'The connection request could not be verified. Start a new connection.',
    meta_token_expired:
      'Your Meta authorization expired. Reconnect to continue.',
    meta_not_configured:
      'Meta connection setup is not complete on this deployment. Contact your administrator.',
    meta_identity_mismatch:
      'Facebook returned a different account identity. Please try connecting again.',
    meta_api_error:
      'Facebook could not complete the connection. Please try again.',
  };
  return reason && Object.hasOwn(reasons, reason)
    ? reasons[reason]
    : 'Meta could not be connected. Please try again or ask your administrator to check the setup.';
}
