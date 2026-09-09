import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/src/lib/auth-api';
import { metaApi, MetaApiError } from '@/src/lib/meta-api';
import { queryKeys } from '@/src/lib/query-keys';
import { isDemoWorkspace } from '@/src/lib/workspaces';
import { deriveWorkspaceJourney } from '@/src/lib/workspace-journey';
import {
  isAuthenticationRequired,
  useConnectionState,
} from './connection-state';

export function useWorkspaceJourney(workspaceId: string) {
  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.session,
    retry: false,
    staleTime: 30_000,
  });
  const connectionWorkspaceId =
    isDemoWorkspace(workspaceId) && session.data?.user
      ? session.data.user.defaultWorkspaceId
      : workspaceId;
  const meta = useQuery({
    queryKey: queryKeys.metaConnection(connectionWorkspaceId),
    queryFn: ({ signal }) => metaApi.status(connectionWorkspaceId, signal),
    enabled: Boolean(session.data?.user) && !session.isError,
    retry: false,
    staleTime: 30_000,
  });
  // Keep the shared next action current if authorization expires while this page is open.
  const timedState = useConnectionState(meta.data);
  const expiredCode = timedState.expired ? 'meta_token_expired' : undefined;
  const journey = deriveWorkspaceJourney({
    workspaceId,
    session: session.data,
    sessionPending: session.isPending,
    sessionFailed: session.isError,
    meta: meta.data,
    metaPending: Boolean(session.data?.user) && meta.isPending,
    metaFailed: meta.isError,
    metaAuthRequired: isAuthenticationRequired(meta.error),
    metaErrorCode:
      expiredCode ??
      (meta.error instanceof MetaApiError ? meta.error.code : undefined),
  });
  return { ...journey, sessionQuery: session, metaQuery: meta };
}
