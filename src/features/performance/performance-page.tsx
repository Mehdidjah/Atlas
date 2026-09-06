import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppFrame } from '@/src/components/shell/app-frame';
import {
  PageSkeleton,
  QueryError,
} from '@/src/components/feedback/query-state';
import { PerformanceRail } from '@/src/features/performance/components/performance-rail';
import { PerformanceEmpty } from '@/src/features/performance/components/performance-empty';
import { KpiStrip } from '@/src/features/performance/components/kpi-strip';
import { PerformanceChart } from '@/src/features/performance/components/performance-chart';
import { CampaignTable } from '@/src/features/performance/components/campaign-table';
import { queryKeys } from '@/src/lib/query-keys';
import { demoApi } from '@/src/lib/demo-api';
import type { Channel, DashboardFilters } from '@/src/lib/types';

export type PerformanceMode =
  | 'overview'
  | 'rules'
  | 'analyze'
  | 'launch'
  | 'activity';

type PerformanceSearch = {
  range?: '7d' | '30d' | '90d';
  compare?: 'previous' | 'year';
  channel?: Channel;
  status?: DashboardFilters['status'];
  q?: string;
  demo?: 'empty' | 'populated';
  page?: number;
  sort?: string;
};

const titles: Record<PerformanceMode, { title: string; subtitle: string }> = {
  overview: {
    title: 'Performance',
    subtitle: 'Your cross-channel command center',
  },
  rules: {
    title: 'Rules',
    subtitle: 'Automate guardrails without giving up control',
  },
  analyze: {
    title: 'Analyze',
    subtitle: 'Prioritized opportunities from live delivery data',
  },
  launch: { title: 'Launch', subtitle: 'Prepare a campaign draft for review' },
  activity: {
    title: 'Activity',
    subtitle: 'A transparent log of human and agent actions',
  },
};

function FilterBar({
  filters,
  onChange,
}: {
  filters: DashboardFilters;
  onChange: (patch: Partial<PerformanceSearch>) => void;
}) {
  const selectClass =
    'h-9 rounded-full border border-[#e0e0e0] bg-white px-3 pr-8 text-[13px] font-semibold outline-none hover:border-[#cccccc] focus:border-[#9e9e9e]';
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <label className="relative min-w-[220px] flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9e9e9e]" />
        <input
          value={filters.search}
          onChange={(event) => onChange({ q: event.target.value })}
          className="h-9 w-full rounded-full border border-[#e0e0e0] pl-9 pr-3 text-[13px] outline-none hover:border-[#cccccc] focus:border-[#9e9e9e]"
          placeholder="Search campaigns"
          aria-label="Search campaigns"
        />
      </label>
      <select
        aria-label="Date range"
        className={selectClass}
        value={filters.range}
        onChange={(event) =>
          onChange({ range: event.target.value as DashboardFilters['range'] })
        }
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>
      <select
        aria-label="Comparison period"
        className={selectClass}
        value={filters.compare}
        onChange={(event) =>
          onChange({
            compare: event.target.value as DashboardFilters['compare'],
          })
        }
      >
        <option value="previous">Previous period</option>
        <option value="year">Previous year</option>
      </select>
      <select
        aria-label="Channel"
        className={selectClass}
        value={filters.channel}
        onChange={(event) =>
          onChange({ channel: event.target.value as Channel })
        }
      >
        <option>All channels</option>
        <option>Meta</option>
        <option>Google</option>
        <option>TikTok</option>
      </select>
      <select
        aria-label="Campaign status"
        className={selectClass}
        value={filters.status}
        onChange={(event) =>
          onChange({ status: event.target.value as DashboardFilters['status'] })
        }
      >
        <option>All statuses</option>
        <option>Active</option>
        <option>Paused</option>
        <option>Draft</option>
      </select>
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
  const navigate = useNavigate({
    from: '/workspaces/$workspaceId/performance',
  });
  const onChange = (patch: Partial<PerformanceSearch>) =>
    navigate({
      search: (current) => ({ ...current, ...patch }),
      replace: true,
    });
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(workspaceId, filters),
    queryFn: ({ signal }) => demoApi.getDashboard(filters, signal),
  });
  const campaignsQuery = useQuery({
    queryKey: queryKeys.campaigns(workspaceId, filters),
    queryFn: ({ signal }) => demoApi.getCampaigns(filters, signal),
  });
  if (dashboardQuery.isLoading || campaignsQuery.isLoading)
    return <PageSkeleton />;
  if (dashboardQuery.isError || campaignsQuery.isError)
    return (
      <QueryError
        retry={() => {
          void dashboardQuery.refetch();
          void campaignsQuery.refetch();
        }}
      />
    );
  const dashboard = dashboardQuery.data!;
  const campaigns = campaignsQuery.data!;
  return (
    <>
      <FilterBar filters={filters} onChange={onChange} />
      {!dashboard.metrics.length ? (
        <PerformanceEmpty workspaceId={workspaceId} />
      ) : (
        <>
          <KpiStrip metrics={dashboard.metrics} />
          <PerformanceChart data={dashboard.series} range={filters.range} />
          {campaigns.length ? (
            <CampaignTable campaigns={campaigns} />
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#cccccc] p-10 text-center">
              <h2 className="font-semibold">
                No campaigns match these filters
              </h2>
              <p className="mt-1 text-[#636363]">
                Try another channel, status, or search term.
              </p>
              <button
                className="mt-4 h-9 rounded-full bg-[#161616] px-4 font-semibold text-white"
                onClick={() =>
                  onChange({
                    q: '',
                    channel: 'All channels',
                    status: 'All statuses',
                  })
                }
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function RulesView({
  workspaceId,
  demo,
}: {
  workspaceId: string;
  demo: 'empty' | 'populated';
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.rules(workspaceId, demo),
    queryFn: ({ signal }) => demoApi.getRules(demo, signal),
  });
  if (isLoading) return <PageSkeleton />;
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <p className="max-w-xl text-[#636363]">
          Rules watch every delivery cycle and act only inside the thresholds
          you approve.
        </p>
        <button
          onClick={() => toast.success('New rule draft created')}
          className="flex h-9 items-center gap-2 rounded-full bg-[#161616] px-4 font-semibold text-white hover:bg-[#2e2e2e]"
        >
          <Plus className="size-4" />
          New rule
        </button>
      </div>
      {data.length ? (
        <div className="overflow-hidden rounded-2xl border border-[#e8e8e8]">
          {data.map((rule) => (
            <article
              key={rule.id}
              className="grid grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_minmax(190px,1fr)_100px] items-center gap-4 border-b border-[#e8e8e8] px-5 py-4 last:border-0 max-lg:grid-cols-1"
            >
              <div>
                <h2 className="font-semibold">{rule.name}</h2>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 text-[12px] font-semibold ${rule.status === 'Running' ? 'bg-[#def4e7] text-[#256b43]' : 'bg-[#f2f2f2] text-[#636363]'}`}
                >
                  {rule.status}
                </span>
              </div>
              <div>
                <span className="text-[12px] text-[#9e9e9e]">WHEN</span>
                <p>{rule.condition}</p>
              </div>
              <div>
                <span className="text-[12px] text-[#9e9e9e]">THEN</span>
                <p>{rule.action}</p>
              </div>
              <div className="text-right text-[12px] text-[#636363] max-lg:text-left">
                {rule.lastRun}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <PerformanceEmpty workspaceId={workspaceId} />
      )}
    </section>
  );
}

function AnalyzeView({
  workspaceId,
  filters,
}: {
  workspaceId: string;
  filters: DashboardFilters;
}) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard(workspaceId, filters),
    queryFn: ({ signal }) => demoApi.getDashboard(filters, signal),
  });
  if (isLoading) return <PageSkeleton />;
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-[#181818] p-6 text-white">
        <div className="flex items-center gap-2 text-white/60">
          <Bot className="size-4" />
          <span className="text-[12px] font-semibold uppercase tracking-[.08em]">
            Aster briefing
          </span>
        </div>
        <h2 className="mt-8 max-w-2xl text-[30px] font-semibold leading-[35px]">
          Profitable growth is available, but retargeting fatigue needs
          attention first.
        </h2>
        <p className="mt-3 max-w-2xl text-white/60">
          Prioritized from spend, conversion volume, CPA stability, and your
          3.0× blended ROAS guardrail.
        </p>
      </div>
      {data?.opportunities.map((item, index) => (
        <article
          key={item.id}
          className="flex items-start gap-4 rounded-2xl border border-[#e8e8e8] p-5"
        >
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.tone === 'good' ? 'bg-[#def4e7] text-[#287a4b]' : 'bg-[#fff0c4] text-[#835d00]'}`}
          >
            {item.tone === 'good' ? (
              <Sparkles className="size-5" />
            ) : (
              <AlertTriangle className="size-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[12px] font-semibold uppercase tracking-[.08em] text-[#9e9e9e]">
              Priority {index + 1}
            </span>
            <h2 className="mt-1 text-[18px] font-semibold">{item.title}</h2>
            <p className="mt-1 text-[#636363]">{item.detail}</p>
          </div>
          <button
            onClick={() =>
              toast.success('Action draft prepared', {
                description: 'Review it in Launch before publishing.',
              })
            }
            className="h-9 shrink-0 rounded-full bg-[#f2f2f2] px-4 font-semibold hover:bg-[#e8e8e8]"
          >
            Prepare action
          </button>
        </article>
      ))}
    </div>
  );
}

const launchSchema = z.object({
  name: z.string().min(3, 'Enter a campaign name.'),
  channel: z.enum(['Meta', 'Google', 'TikTok']),
  objective: z.enum(['Sales', 'Leads', 'Traffic']),
  dailyBudget: z.number().min(10, 'Minimum daily budget is $10.').max(100000),
});
type LaunchForm = z.infer<typeof launchSchema>;
function LaunchView() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LaunchForm>({
    resolver: zodResolver(launchSchema),
    defaultValues: {
      name: '',
      channel: 'Meta',
      objective: 'Sales',
      dailyBudget: 100,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: LaunchForm) => demoApi.createCampaign(values),
    onSuccess: (campaign) => {
      toast.success('Campaign draft created', {
        description: `${campaign.name} is ready for review. Nothing has been published.`,
      });
      reset();
    },
  });
  const field =
    'mt-1 h-12 w-full rounded-2xl border border-[#e0e0e0] bg-white px-5 outline-none hover:border-[#cccccc] focus:border-[#9e9e9e]';
  return (
    <div className="grid grid-cols-[minmax(0,640px)_minmax(280px,1fr)] gap-8 max-lg:grid-cols-1">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="rounded-3xl border border-[#e8e8e8] p-6"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#fff0a2]">
            <Rocket className="size-5" />
          </span>
          <div>
            <h2 className="text-[24px] font-semibold">Campaign brief</h2>
            <p className="text-[13px] text-[#636363]">
              Creates a safe draft—never publishes automatically.
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-5">
          <label className="font-semibold">
            Campaign name
            <input
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              className={field}
              placeholder="e.g. US · Fall launch · Prospecting"
            />
            <span className="mt-1 block text-[13px] font-normal text-[#cd2823]">
              {errors.name?.message}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <label className="font-semibold">
              Channel
              <select {...register('channel')} className={field}>
                <option>Meta</option>
                <option>Google</option>
                <option>TikTok</option>
              </select>
            </label>
            <label className="font-semibold">
              Objective
              <select {...register('objective')} className={field}>
                <option>Sales</option>
                <option>Leads</option>
                <option>Traffic</option>
              </select>
            </label>
          </div>
          <label className="font-semibold">
            Daily budget
            <input
              {...register('dailyBudget', { valueAsNumber: true })}
              type="number"
              className={field}
            />
            <span className="mt-1 block text-[13px] font-normal text-[#cd2823]">
              {errors.dailyBudget?.message}
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-6 h-12 w-full rounded-full bg-[#161616] text-[18px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
        >
          {mutation.isPending ? 'Preparing draft…' : 'Create campaign draft'}
        </button>
      </form>
      <aside className="rounded-3xl bg-[#f8f8f8] p-6">
        <Wand2 className="size-5 text-[#734ede]" />
        <h2 className="mt-4 text-[18px] font-semibold">What Aster checks</h2>
        <ul className="mt-4 grid gap-4 text-[#636363]">
          {[
            'Budget against workspace guardrails',
            'Naming and tracking consistency',
            'Audience and placement conflicts',
            'A clear review before any publish action',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#287a4b]" />
              {item}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function ActivityView({
  workspaceId,
  demo,
}: {
  workspaceId: string;
  demo: 'empty' | 'populated';
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: queryKeys.activity(workspaceId, demo),
    queryFn: ({ signal }) => demoApi.getActivity(demo, signal),
  });
  if (isLoading) return <PageSkeleton />;
  const icons = {
    agent: Bot,
    campaign: CircleDollarSign,
    alert: AlertTriangle,
  };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-2xl bg-[#f8f8f8] p-4 text-[#636363]">
        Every automated recommendation and account mutation is recorded here for
        auditability.
      </div>
      <div className="relative grid gap-1 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-[#e0e0e0]">
        {data.map((item) => {
          const Icon = icons[item.kind];
          return (
            <article
              key={item.id}
              className="relative flex gap-4 rounded-2xl p-4 hover:bg-[#f8f8f8]"
            >
              <span className="z-10 grid size-10 shrink-0 place-items-center rounded-xl border border-[#e8e8e8] bg-white">
                <Icon className="size-4" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{item.title}</h2>
                  <span className="text-[12px] text-[#9e9e9e]">
                    {item.time}
                  </span>
                </div>
                <p className="mt-1 text-[#636363]">{item.detail}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function PerformancePage({ mode }: { mode: PerformanceMode }) {
  const { workspaceId } = useParams({ strict: false }) as {
    workspaceId: string;
  };
  const search = useSearch({ strict: false }) as PerformanceSearch;
  const filters = useMemo<DashboardFilters>(
    () => ({
      range: search.range ?? '30d',
      compare: search.compare ?? 'previous',
      channel: search.channel ?? 'All channels',
      status: search.status ?? 'All statuses',
      search: search.q ?? '',
      demo:
        search.demo ??
        (import.meta.env.VITE_DEMO_STATE === 'empty' ? 'empty' : 'populated'),
    }),
    [search],
  );
  const copy = titles[mode];
  return (
    <AppFrame workspaceId={workspaceId} section="performance">
      <div className="flex h-full min-w-0">
        <PerformanceRail workspaceId={workspaceId} mode={mode} />
        <main className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 flex min-h-[61px] items-center border-b border-[#e8e8e8] bg-white/95 px-[50px] backdrop-blur-sm max-lg:px-[30px] max-sm:px-4">
            <div>
              <h1 className="text-[24px] font-semibold leading-8">
                {copy.title}
              </h1>
              <p className="text-[12px] text-[#9e9e9e]">{copy.subtitle}</p>
            </div>
          </header>
          <div className="px-[50px] pb-[50px] pt-9 max-lg:px-[30px] max-sm:px-4">
            {mode === 'overview' ? (
              <PerformanceOverview
                workspaceId={workspaceId}
                filters={filters}
              />
            ) : null}
            {mode === 'rules' ? (
              <RulesView workspaceId={workspaceId} demo={filters.demo} />
            ) : null}
            {mode === 'analyze' ? (
              <AnalyzeView workspaceId={workspaceId} filters={filters} />
            ) : null}
            {mode === 'launch' ? <LaunchView /> : null}
            {mode === 'activity' ? (
              <ActivityView workspaceId={workspaceId} demo={filters.demo} />
            ) : null}
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
