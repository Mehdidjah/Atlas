import type { MetaConnectionStatus } from '@/src/lib/types';

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export class MetaApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response
      .json()
      .then((value) => value as ApiErrorBody)
      .catch(() => null);
    throw new MetaApiError(
      body?.error?.code ?? 'request_failed',
      body?.error?.message ?? 'The Meta request failed. Please try again.',
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

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
  disconnect: (workspaceId: string) =>
    request<{ success: true; revokedAtMeta: boolean }>(
      `/api/meta/connection?${workspaceQuery(workspaceId)}`,
      { method: 'DELETE' },
    ),
};
