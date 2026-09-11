import { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { AppFrame } from '@/src/components/shell/app-frame';
import { PerformanceRail } from './components/performance-rail';
import { PerformanceEmpty } from './components/performance-empty';
import { KpiStrip } from './components/kpi-strip';
import { PerformanceChart } from './components/performance-chart';
import { CampaignTable } from './components/campaign-table';
import { DraftsView } from './components/draft-workflow';
import {
  ActivityView,
  AnalyzeView,
  RulesView,
} from './components/secondary-views';
import {
  EmptyState,
  ErrorNotice,
  LoadingState,
  SuccessNotice,
} from './components/workflow';
import { demoApi } from '@/src/lib/demo-api';
import {
  isDemoWorkspace,
  resolveWorkspaceDataMode,
} from '@/src/lib/workspaces';
import type { Channel, DashboardFilters } from '@/src/lib/types';
export type PerformanceMode =
  | 'overview'
  | 'rules'
  | 'analyze'
  | 'launch'
  | 'activity';
type PerformanceSearch = {
  range?: DashboardFilters['range'];
  compare?: DashboardFilters['compare'];
  channel?: Channel;
  status?: DashboardFilters['status'];
  q?: string;
  demo?: DashboardFilters['demo'];
  page?: number;
  sort?: string;
};
const copy: Record<PerformanceMode, { title: string; description: string }> = {
  overview: {
    title: 'Campaigns',
    description: 'Review reporting and prepare your next campaign',
  },
  rules: {
    title: 'Automation rules (preview)',
    description: 'Save review conditions. Automation is unavailable.',
  },
  analyze: {
    title: 'Recommendations',
    description: 'Review opportunities before making changes',
  },
  launch: {
    title: 'Drafts & approvals',
    description: 'Plan, review, and approve locally. Publishing unavailable.',
  },
  activity: {
    title: 'Activity',
    description: 'Saved drafts, approvals, and local changes',
  },
};
function FilterBar({
  filters,
  onChange,
}: {
  filters: DashboardFilters;
  onChange: (patch: Partial<PerformanceSearch>) => void;
}) {
  const [typedSearch, setTypedSearch] = useState({
    value: filters.search,
    base: filters.search,
  });
  const search =
    typedSearch.base === filters.search ? typedSearch.value : filters.search;
  const setSearch = (value: string) =>
    setTypedSearch({ value, base: filters.search });
  useEffect(() => {
    if (search === filters.search) return;
    const timer = window.setTimeout(
      () => onChange({ q: search, page: 1 }),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [search, filters.search, onChange]);
  const select =
    'h-9 rounded-full border border-[#e0e0e0] bg-white px-3 pr-8 text-[13px] font-semibold outline-none hover:border-[#cccccc] focus:border-[#9e9e9e]';
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <label className="relative min-w-[220px] flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9e9e9e]" />
        <input
          aria-label="Search campaigns"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-full border border-[#e0e0e0] pl-9 pr-3 text-[13px] outline-none hover:border-[#cccccc] focus:border-[#9e9e9e]"
          placeholder="Search campaigns"
        />
      </label>
      <select
        aria-label="Date range"
        className={select}
        value={filters.range}
        onChange={(e) =>
          onChange({ range: e.target.value as DashboardFilters['range'] })
        }
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>
      <select
        aria-label="Comparison period"
        className={select}
        value={filters.compare}
        onChange={(e) =>
          onChange({ compare: e.target.value as DashboardFilters['compare'] })
        }
      >
        <option value="previous">Previous period</option>
        <option value="year">Previous year</option>
      </select>
      <select
        aria-label="Channel"
        className={select}
        value={filters.channel}
        onChange={(e) => onChange({ channel: e.target.value as Channel })}
      >
        <option>All channels</option>
        <option>Meta</option>
        <option>Google</option>
        <option>TikTok</option>
      </select>
      <select
        aria-label="Campaign status"
        className={select}
        value={filters.status}
        onChange={(e) =>
          onChange({ status: e.target.value as DashboardFilters['status'] })
        }
      >
        <option>All statuses</option>
        <option>Active</option>
        <option>Paused</option>
        <option>Draft</option>
      </select>
      {(filters.search ||
        filters.channel !== 'All channels' ||
        filters.status !== 'All statuses') && (
        <button
          className="h-9 rounded-full px-3 font-semibold text-[#636363] hover:bg-[#f2f2f2] disabled:opacity-50 text-sm"
          onClick={() => {
            setSearch('');
            onChange({
              q: '',
              channel: 'All channels',
              status: 'All statuses',
              page: 1,
            });
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
function PerformanceOverview({
  workspaceId,
  filters,
}: {
  workspaceId: string;
  filters: DashboardFilters;
}) {
  const [notice, setNotice] = useState('');
  // One query snapshot prevents KPI/chart/table mismatches during transitions.
  const query = useQuery({
    queryKey: ['dashboard', workspaceId, 'monitor', filters],
    queryFn: async ({ signal }) => {
      const [dashboard, campaigns] = await Promise.all([
        demoApi.getDashboard(filters, signal, workspaceId),
        demoApi.getCampaigns(filters, signal, workspaceId),
      ]);
      return { dashboard, campaigns };
    },
    placeholderData: keepPreviousData,
  });
  return (
    <>
      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      <output className="block mb-3 min-h-4 text-xs text-[#9e9e9e]">
        {query.isFetching && query.data
          ? 'Updating results…'
          : 'Sample reporting period ends September 5, 2026. All amounts in USD.'}
      </output>
      <ErrorNotice error={query.error} />
      {query.isError && (
        <button
          className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50 mb-4"
          onClick={() => void query.refetch()}
        >
          Retry loading
        </button>
      )}
      {query.isPending ? (
        <LoadingState />
      ) : query.data ? (
        query.data.campaigns.length ? (
          <div
            aria-busy={query.isFetching}
            className={query.isPlaceholderData ? 'opacity-60' : ''}
          >
            <KpiStrip metrics={query.data.dashboard.metrics} />
            <PerformanceChart
              data={query.data.dashboard.series}
              range={filters.range}
            />
            <CampaignTable
              workspaceId={workspaceId}
              campaigns={query.data.campaigns}
              busy={query.isFetching || query.isError}
              onNotice={setNotice}
            />
          </div>
        ) : filters.demo === 'empty' ? (
          <PerformanceEmpty workspaceId={workspaceId} />
        ) : (
          <EmptyState title="No campaigns match these filters">
            Try another channel, status, or search term. Clear filters to see
            every sample campaign.
          </EmptyState>
        )
      ) : null}
    </>
  );
}
export function PerformancePage({ mode }: { mode: PerformanceMode }) {
  const { workspaceId } = useParams({ strict: false }) as {
    workspaceId: string;
  };
  const search = useSearch({ strict: false }) as PerformanceSearch;
  const navigate = useNavigate();
  const filters = useMemo<DashboardFilters>(
    () => ({
      range: search.range ?? '30d',
      compare: search.compare ?? 'previous',
      channel: search.channel ?? 'All channels',
      status: search.status ?? 'All statuses',
      search: search.q ?? '',
      demo: resolveWorkspaceDataMode(
        workspaceId,
        search.demo,
        import.meta.env.VITE_DEMO_STATE,
      ),
    }),
    [search, workspaceId],
  );
  const onChange = useCallback(
    (patch: Partial<PerformanceSearch>) => {
      void navigate({
        to: '.',
        search: (current: PerformanceSearch) => ({ ...current, ...patch }),
        replace: true,
      });
    },
    [navigate],
  );
  return (
    <AppFrame workspaceId={workspaceId} section="performance">
      <div className="flex h-full min-w-0">
        <PerformanceRail workspaceId={workspaceId} mode={mode} />
        <main className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 flex min-h-[61px] items-center justify-between gap-3 border-b border-[#e8e8e8] bg-white/95 px-[50px] backdrop-blur-sm max-lg:px-[30px] max-sm:px-4">
            <div>
              <h1 className="text-[24px] font-semibold leading-8">
                {copy[mode].title}
              </h1>
              <p className="text-[12px] text-[#9e9e9e]">
                {copy[mode].description}
              </p>
            </div>
            {(mode === 'overview' || mode === 'analyze') && (
              <Link
                to="/workspaces/$workspaceId/performance/launch"
                params={{ workspaceId }}
                className="flex min-h-9 shrink-0 items-center justify-center rounded-full bg-[#161616] px-4 text-center text-[13px] font-semibold text-white hover:bg-[#2e2e2e] max-sm:max-w-[135px] max-sm:shrink max-sm:px-3"
              >
                <span className="sm:hidden">New draft</span>
                <span className="hidden sm:inline">Create campaign draft</span>
              </Link>
            )}
          </header>
          <div className="px-[50px] pb-[50px] pt-9 max-lg:px-[30px] max-sm:px-4">
            {(mode === 'overview' || mode === 'analyze') && (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[12px] text-[#9e9e9e]">
                    {filters.demo === 'populated'
                      ? 'Sample preview · not live account data.'
                      : 'Workspace reporting · no live dataset yet.'}
                  </p>
                  {(!isDemoWorkspace(workspaceId) ||
                    filters.demo === 'empty') && (
                    <button
                      type="button"
                      className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50"
                      onClick={() =>
                        onChange({
                          demo:
                            filters.demo === 'populated'
                              ? 'empty'
                              : 'populated',
                        })
                      }
                    >
                      {filters.demo === 'populated'
                        ? 'Return to workspace'
                        : 'Preview sample data'}
                    </button>
                  )}
                </div>
                {filters.demo === 'populated' && (
                  <FilterBar filters={filters} onChange={onChange} />
                )}
              </>
            )}
            {mode === 'overview' &&
              (filters.demo === 'empty' ? (
                <PerformanceEmpty key={workspaceId} workspaceId={workspaceId} />
              ) : (
                <PerformanceOverview
                  key={workspaceId}
                  workspaceId={workspaceId}
                  filters={filters}
                />
              ))}
            {mode === 'analyze' && (
              <AnalyzeView
                key={workspaceId}
                workspaceId={workspaceId}
                filters={filters}
              />
            )}
            {mode === 'launch' && (
              <DraftsView key={workspaceId} workspaceId={workspaceId} />
            )}
            {mode === 'rules' && (
              <RulesView
                key={workspaceId}
                workspaceId={workspaceId}
                demo={filters.demo}
              />
            )}
            {mode === 'activity' && (
              <ActivityView
                key={workspaceId}
                workspaceId={workspaceId}
                demo={filters.demo}
              />
            )}
          </div>
        </main>
      </div>
    </AppFrame>
  );
}
export function PerformanceOverviewPage() {
  return <PerformancePage mode="overview" />;
}
export function RulesPage() {
  return <PerformancePage mode="rules" />;
}
export function AnalyzePage() {
  return <PerformancePage mode="analyze" />;
}
export function LaunchPage() {
  return <PerformancePage mode="launch" />;
}
export function ActivityPage() {
  return <PerformancePage mode="activity" />;
}
