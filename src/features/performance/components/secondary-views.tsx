import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus, Sparkles, UserRound, Bot, ArrowUpRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { demoApi } from '@/src/lib/demo-api';
import { queryKeys } from '@/src/lib/query-keys';
import type { Campaign, DashboardFilters, DemoRule } from '@/src/lib/types';
import { preciseCurrency as currency } from '@/src/lib/formatters';
import { ruleSchema, type RuleInput } from '../performance-store';
import { DraftEditor } from './draft-workflow';
import { PerformanceEmpty } from './performance-empty';
import {
  EmptyState,
  ErrorNotice,
  LoadingState,
  SuccessNotice,
  inputClass,
  useRefreshPerformance,
} from './workflow';

export function AnalyzeView({
  workspaceId,
  filters,
}: {
  workspaceId: string;
  filters: DashboardFilters;
}) {
  const query = useQuery({
    queryKey: queryKeys.campaigns(workspaceId, filters),
    enabled: filters.demo === 'populated',
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => demoApi.getCampaigns(filters, signal, workspaceId),
  });
  const [selected, setSelected] = useState<Campaign | null>(null),
    [preparing, setPreparing] = useState<Campaign | null>(null),
    [success, setSuccess] = useState('');
  const eligible = (query.data ?? [])
    .filter((c) => c.status === 'Active' && c.spend > 0)
    .sort((a, b) => b.cpa - a.cpa)
    .slice(0, 3);
  const reason = (c: Campaign) =>
    `${c.name} has ${currency.format(c.cpa)} CPA, ${c.conversions} conversions and ${c.roas.toFixed(2)}× ROAS in the selected ${Number.parseInt(filters.range)} sample days. This is a heuristic review prompt, not a forecast or a live diagnosis.`;
  if (filters.demo === 'empty')
    return <PerformanceEmpty workspaceId={workspaceId} recommendations />;
  return (
    <>
      {success && <SuccessNotice>{success}</SuccessNotice>}
      <div className="mb-4 rounded-2xl bg-[#181818] p-6 text-white">
        <div className="flex items-center gap-2 text-white/60">
          <Bot className="size-4" />
          <span className="text-[12px] font-semibold uppercase tracking-[.08em]">
            Aster briefing
          </span>
        </div>
        <div>
          <h2 className="mt-8 max-w-2xl text-[30px] font-semibold leading-[35px]">
            Start with the cost of a conversion
          </h2>
          <p className="mt-3 max-w-2xl text-white/60">
            Up to three active sample campaigns, ordered by highest CPA. Inspect
            the evidence, then prepare a draft. No changes are applied.
          </p>
        </div>
      </div>
      <ErrorNotice error={query.error} />
      {query.isError && (
        <button
          className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50 mb-4"
          onClick={() => void query.refetch()}
        >
          Retry
        </button>
      )}
      {query.isPending ? (
        <LoadingState />
      ) : !eligible.length ? (
        <EmptyState title="No recommendations to review">
          No active sample campaigns with spend match these filters. Try another
          platform or status. Drafts do not have performance recommendations.
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          {eligible.map((c, i) => (
            <article
              key={c.id}
              className="flex flex-wrap items-start gap-4 rounded-2xl border border-[#e8e8e8] p-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0c4] text-[#835d00]">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#9e9e9e]">
                  Priority {i + 1} · {c.channel}
                </p>
                <h2 className="mt-1 text-[18px] font-semibold">
                  Review {c.name}
                </h2>
                <p className="mt-2 text-sm text-[#636363]">
                  {currency.format(c.cpa)} per conversion · {c.roas.toFixed(2)}×
                  return · {c.conversions.toLocaleString()} conversions
                </p>
              </div>
              <button
                className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50 flex items-center gap-2"
                disabled={query.isFetching || query.isError}
                onClick={() => setSelected(c)}
              >
                Inspect recommendation
                <ArrowUpRight size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="pr-6 text-[24px] font-semibold leading-7">
              Why review this campaign?
            </DialogTitle>
            <DialogDescription>
              Assistant suggestion from synthetic sample data. Not live advice.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <h3 className="font-semibold">{selected.name}</h3>
              <p className="text-sm leading-6 text-[#636363]">
                {reason(selected)}
              </p>
              <div className="rounded-xl bg-[#f8f8f8] p-4 text-sm">
                <strong>Before any real budget decision</strong>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-[#636363]">
                  <li>
                    Verify tracking, conversion quality, and your profitability
                    target.
                  </li>
                  <li>
                    Review creative and audience overlap in your ad platform.
                  </li>
                  <li>
                    Check the actual current budget. It is not available here.
                  </li>
                </ul>
              </div>
              <p className="text-sm text-[#636363]">
                You can prepare an absolute daily budget proposal, bounded to
                $10–$1,000. It must be saved, reviewed and approved locally. No
                budget is applied.
              </p>
              <button
                className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
                onClick={() => {
                  setPreparing(selected);
                  setSelected(null);
                }}
              >
                Prepare a draft action
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
      {preparing && (
        <DraftEditor
          workspaceId={workspaceId}
          initial={{
            name: `${preparing.name} · review`.slice(0, 100),
            channel: preparing.channel,
            objective: 'Sales',
            dailyBudget: 100,
          }}
          options={{
            campaignId: preparing.id,
            reason: reason(preparing),
            assistant: true,
          }}
          onClose={() => setPreparing(null)}
          onSaved={(d) =>
            setSuccess(
              `${d.name} saved as a budget request. Review it in Drafts & approvals. Nothing has been applied.`,
            )
          }
        />
      )}
    </>
  );
}
function RuleEditor({
  workspaceId,
  existing,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  existing?: DemoRule;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const form = useForm<RuleInput>({
    resolver: zodResolver(ruleSchema),
    defaultValues: existing ?? { name: '', metric: 'CPA', threshold: 35 },
  });
  const [review, setReview] = useState<RuleInput | null>(null),
    [confirmed, setConfirmed] = useState(false);
  const refresh = useRefreshPerformance(workspaceId);
  const mutation = useMutation({
    mutationFn: (v: RuleInput) =>
      demoApi.saveRule(v, workspaceId, existing?.id),
    onSuccess: async (r) => {
      await refresh();
      onSaved(r.name);
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!mutation.isPending}
        className="max-h-[90dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-[560px]"
      >
        <DialogHeader>
          <DialogTitle className="text-[24px] font-semibold leading-7">
            {review
              ? 'Review rule draft'
              : existing
                ? 'Edit rule draft'
                : 'New rule draft'}
          </DialogTitle>
          <DialogDescription>
            Draft only. There is no rule engine, scheduling or automatic ad
            action.
          </DialogDescription>
        </DialogHeader>
        {review ? (
          <>
            <div className="rounded-xl bg-[#f8f8f8] p-4 text-sm">
              <h3 className="font-semibold">{review.name}</h3>
              <p className="mt-3">
                If {review.metric} stays{' '}
                {review.metric === 'CPA' ? 'above' : 'below'}{' '}
                {review.metric === 'CPA' ? '$' : ''}
                {review.threshold}
                {review.metric === 'ROAS' ? '×' : ''} for 3 days
              </p>
              <p className="mt-2">
                Then: prepare a request for human review only.
              </p>
              <p className="mt-2 font-medium">
                Saved status: draft, not enabled. No spend or campaign change.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 accent-[#161616]"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I reviewed this rule and understand it will not run.
            </label>
            <ErrorNotice error={mutation.error} />
            <div className="flex justify-end gap-2">
              <button
                className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50"
                disabled={mutation.isPending}
                onClick={() => setReview(null)}
              >
                Back to edit
              </button>
              <button
                className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
                disabled={!confirmed || mutation.isPending}
                onClick={() => mutation.mutate(review)}
              >
                {mutation.isPending ? 'Saving…' : 'Save rule draft'}
              </button>
            </div>
          </>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) => {
              setReview(v);
              setConfirmed(false);
            })}
          >
            <label className="text-sm font-medium">
              Rule name
              <input
                {...form.register('name')}
                className={inputClass}
                placeholder="e.g. Review expensive conversions"
                aria-invalid={!!form.formState.errors.name}
              />
              <span className="text-xs text-red-700" role="alert">
                {form.formState.errors.name?.message}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium">
                Watch metric
                <select {...form.register('metric')} className={inputClass}>
                  <option value="CPA">CPA above (USD)</option>
                  <option value="ROAS">ROAS below (×)</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Threshold
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  {...form.register('threshold', { valueAsNumber: true })}
                  className={inputClass}
                  aria-invalid={!!form.formState.errors.threshold}
                />
                <span className="text-xs text-red-700" role="alert">
                  {form.formState.errors.threshold?.message}
                </span>
              </label>
            </div>
            <p className="text-sm text-[#636363]">
              Proposed observation period: 3 days. Proposed action: request
              human review. Saving will not enable automation.
            </p>
            <button
              className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50 justify-self-end"
              type="submit"
            >
              Review rule draft
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
export function RulesView({
  workspaceId,
  demo,
}: {
  workspaceId: string;
  demo: DashboardFilters['demo'];
}) {
  const query = useQuery({
    queryKey: queryKeys.rules(workspaceId, demo),
    queryFn: ({ signal }) => demoApi.getRules(demo, signal, workspaceId),
  });
  const [editing, setEditing] = useState<DemoRule | 'new' | null>(null),
    [success, setSuccess] = useState('');
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-[#636363]">
          Define when a person should review performance. Rules can be saved and
          edited, but cannot run.
        </p>
        <button
          className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50 flex items-center gap-2"
          onClick={() => setEditing('new')}
        >
          <Plus size={16} />
          New rule draft
        </button>
      </div>
      {success && <SuccessNotice>{success}</SuccessNotice>}
      <ErrorNotice error={query.error} />
      {query.isError && (
        <button
          className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50 mb-4"
          onClick={() => void query.refetch()}
        >
          Retry
        </button>
      )}
      {query.isPending ? (
        <LoadingState />
      ) : !query.data?.length ? (
        <EmptyState title="No rule drafts yet">
          Plan a review condition without giving software permission to spend.
          Automation is not enabled in this prototype.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e8e8e8]">
          {query.data.map((rule) => (
            <article
              key={rule.id}
              className="grid grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_minmax(190px,1fr)_100px] items-center gap-4 border-b border-[#e8e8e8] px-5 py-4 last:border-0 max-lg:grid-cols-1"
            >
              <div>
                <h2 className="font-semibold">{rule.name}</h2>
                <span className="mt-1 inline-flex rounded-full bg-[#f2f2f2] px-2 text-[12px] font-semibold text-[#636363]">
                  Draft
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
                <p>Never run</p>
                <button
                  className="mt-2 h-8 rounded-full border border-[#e0e0e0] px-3 font-semibold hover:bg-[#f8f8f8]"
                  onClick={() => setEditing(rule)}
                >
                  Edit draft
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <RuleEditor
          workspaceId={workspaceId}
          existing={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(name) =>
            setSuccess(
              `${name} saved locally. This rule is not enabled and will not run.`,
            )
          }
        />
      )}
    </>
  );
}
export function ActivityView({
  workspaceId,
  demo,
}: {
  workspaceId: string;
  demo: DashboardFilters['demo'];
}) {
  const query = useQuery({
    queryKey: queryKeys.activity(workspaceId, demo),
    queryFn: ({ signal }) => demoApi.getActivity(demo, signal, workspaceId),
  });
  const [actor, setActor] = useState('all'),
    [kind, setKind] = useState('all'),
    [search, setSearch] = useState(''),
    [range, setRange] = useState('all');
  const [now, setNow] = useState(() => Date.now());
  const cutoff = range === 'all' ? 0 : now - Number(range) * 86400000;
  const rows = (query.data ?? []).filter(
    (a) =>
      (actor === 'all' || a.actor === actor) &&
      (kind === 'all' || a.action === kind) &&
      a.createdAt >= cutoff &&
      `${a.title} ${a.detail}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-2xl bg-[#f8f8f8] p-4 text-[#636363]">
        Saved drafts, approvals, rule edits, and local status changes are
        recorded here.
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="min-w-[180px] flex-1 text-xs text-[#636363]">
          Search activity
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recorded changes"
          />
        </label>
        <label className="text-xs text-[#636363]">
          Actor
          <select
            className={inputClass}
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          >
            <option value="all">Everyone</option>
            <option value="user">You</option>
            <option value="assistant">Assistant</option>
          </select>
        </label>
        <label className="text-xs text-[#636363]">
          Action
          <select
            className={inputClass}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">All actions</option>
            <option value="draft">Drafts & requests</option>
            <option value="approval">Approvals</option>
            <option value="status">Status changes</option>
            <option value="rule">Rule drafts</option>
          </select>
        </label>
        <label className="text-xs text-[#636363]">
          Time
          <select
            className={inputClass}
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              setNow(Date.now());
            }}
          >
            <option value="all">All time</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
      </div>
      <p className="mb-4 text-xs text-[#9e9e9e]">
        Newest first · only actual saved local actions · browser-local history,
        not a compliance audit trail
      </p>
      <ErrorNotice error={query.error} />
      {query.isError && (
        <button
          className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50 mb-4"
          onClick={() => void query.refetch()}
        >
          Retry
        </button>
      )}
      {query.isPending ? (
        <LoadingState />
      ) : !rows.length ? (
        <EmptyState
          title={
            query.data?.length
              ? 'No activity matches these filters'
              : 'No saved activity yet'
          }
        >
          {query.data?.length ? (
            <button
              className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50 mt-3"
              onClick={() => {
                setActor('all');
                setKind('all');
                setSearch('');
                setRange('all');
              }}
            >
              Clear filters
            </button>
          ) : (
            'Saved drafts, local approvals, sample status changes and rule edits will appear here.'
          )}
        </EmptyState>
      ) : (
        <div className="relative grid gap-1 before:absolute before:bottom-6 before:left-5 before:top-6 before:w-px before:bg-[#e0e0e0]">
          {rows.map((item) => (
            <article
              key={item.id}
              className="relative flex gap-4 rounded-2xl p-4 hover:bg-[#f8f8f8]"
            >
              <span className="z-10 grid size-10 shrink-0 place-items-center rounded-xl border border-[#e8e8e8] bg-white">
                {item.actor === 'assistant' ? (
                  <Bot size={18} />
                ) : (
                  <UserRound size={18} />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{item.title}</h2>
                  <span className="inline-flex items-center rounded-full font-semibold bg-[#f2f2f2] px-2 py-1 text-xs text-[#636363]">
                    {item.actor === 'user'
                      ? 'You'
                      : 'Assistant · requested by you'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#636363]">
                  {item.detail}
                </p>
                <time
                  className="mt-2 block text-xs text-[#9e9e9e]"
                  dateTime={new Date(item.createdAt).toISOString()}
                >
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
