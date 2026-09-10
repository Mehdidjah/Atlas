import { useParams, useSearch } from '@tanstack/react-router';
import { resolveWorkspaceDataMode } from '@/src/lib/workspaces';
import type { DashboardFilters } from '@/src/lib/types';

export function useHomeFilters(): DashboardFilters {
  const { workspaceId = 'demo' } = useParams({ strict: false });
  const search = useSearch({ strict: false }) as {
    demo?: 'empty' | 'populated';
  };
  return {
    range: '30d',
    compare: 'previous',
    channel: 'All channels',
    status: 'All statuses',
    search: '',
    demo: resolveWorkspaceDataMode(
      workspaceId,
      search.demo,
      import.meta.env.VITE_DEMO_STATE,
    ),
  };
}
