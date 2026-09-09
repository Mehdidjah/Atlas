import type { MetaConnectionStatus } from '@/src/lib/types';

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export class MetaApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  allowNoContent?: false,
): Promise<T>;
async function request<T>(
  path: string,
  init: RequestInit,
  allowNoContent: true,
): Promise<T | undefined>;
async function request<T>(
  path: string,
  init?: RequestInit,
  allowNoContent = false,
): Promise<T | undefined> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers,
    });
  } catch (error) {
    if (
      init?.signal?.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    )
      throw error;
    throw new MetaApiError(
      'network_error',
      'Could not reach Aster. Check your connection and try again.',
    );
  }
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorBody | null;
    throw new MetaApiError(
      typeof body?.error?.code === 'string'
        ? body.error.code
        : response.status === 401
          ? 'authentication_required'
          : 'request_failed',
      typeof body?.error?.message === 'string'
        ? body.error.message
        : response.status === 401
          ? 'Sign in to Aster to manage your Meta connection.'
          : `The Meta request could not be completed (HTTP ${response.status}). Please try again.`,
      response.status,
    );
  }
  if (response.status === 204 && allowNoContent) return undefined;
  if (response.status === 204)
    throw new MetaApiError(
      'invalid_response',
      'Aster returned no connection data. Please try again.',
      response.status,
    );
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') throw new Error('Missing response');
    return body as T;
  } catch {
    throw new MetaApiError(
      'invalid_response',
      'Aster returned an unreadable response. Please try again.',
      response.status,
    );
  }
}

const workspaceQuery = (workspaceId: string) =>
  new URLSearchParams({ workspaceId }).toString();

export const metaApi = {
  status: (workspaceId: string, signal?: AbortSignal) =>
    request<MetaConnectionStatus>(
      `/api/meta/status?${workspaceQuery(workspaceId)}`,
      { signal },
    ),
  connectUrl: (workspaceId: string) =>
    `/api/meta/connect?${workspaceQuery(workspaceId)}`,
  refresh: (workspaceId: string) =>
    request<{ success: true; accountCount: number }>(
      `/api/meta/refresh?${workspaceQuery(workspaceId)}`,
      { method: 'POST' },
    ),
  selectAccounts: (workspaceId: string, accountIds: string[]) =>
    request<{ success: true; selectedCount: number }>(
      `/api/meta/accounts/select?${workspaceQuery(workspaceId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds }),
      },
    ),
  // Only DELETE can return 204 in the current worker contract.
  disconnect: (workspaceId: string) =>
    request<{ success: true; revokedAtMeta: boolean }>(
      `/api/meta/connection?${workspaceQuery(workspaceId)}`,
      { method: 'DELETE' },
      true,
    ),
};
