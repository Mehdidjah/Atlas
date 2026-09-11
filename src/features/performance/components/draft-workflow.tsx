import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FileText, Rocket, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { demoApi } from '@/src/lib/demo-api';
import type { DemoDraft } from '@/src/lib/types';
import { preciseCurrency as currency } from '@/src/lib/formatters';
import { draftSchema, type DraftInput } from '../performance-store';
import {
  EmptyState,
  ErrorNotice,
  SuccessNotice,
  LoadingState,
  inputClass,
  useRefreshPerformance,
} from './workflow';

function DraftSummary({ draft }: { draft: DraftInput }) {
  return (
    <dl className="grid grid-cols-2 gap-4 rounded-xl bg-[#f8f8f8] p-4 text-sm">
      {[
        ['Name', draft.name],
        ['Platform', draft.channel],
        ['Objective', draft.objective],
        ['Proposed daily budget', currency.format(draft.dailyBudget)],
        ['30-day planning amount', currency.format(draft.dailyBudget * 30)],
        ['Delivery', 'Not published · no spend'],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-[#636363]">{label}</dt>
          <dd className="mt-1 break-words font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function DraftEditor({
  workspaceId,
  initial,
  startInReview = false,
  options,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  initial?: Partial<DraftInput>;
  startInReview?: boolean;
  options?: { campaignId?: string; reason?: string; assistant?: boolean };
  onClose: () => void;
  onSaved?: (draft: DemoDraft) => void;
}) {
  const [review, setReview] = useState<DraftInput | null>(
    startInReview && initial ? draftSchema.parse(initial) : null,
  );
  const [confirmed, setConfirmed] = useState(false);
  const refresh = useRefreshPerformance(workspaceId);
  const form = useForm<DraftInput>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      name: '',
      channel: 'Meta',
      objective: 'Sales',
      dailyBudget: 100,
      ...initial,
    },
  });
  const save = useMutation({
    mutationFn: (values: DraftInput) =>
      options
        ? demoApi.prepareBudgetRequest(values, workspaceId, options)
        : demoApi.createCampaign(values, workspaceId),
    onSuccess: async (draft) => {
      await refresh();
      onSaved?.(draft);
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!save.isPending}
        className="max-h-[90dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-[560px]"
      >
        <DialogHeader>
          <DialogTitle className="pr-6 text-[24px] font-semibold leading-7">
            {review
              ? 'Review your draft'
              : options?.campaignId
                ? 'Prepare a budget request'
                : 'New campaign draft'}
          </DialogTitle>
          <DialogDescription>
            {review
              ? '2 · Review. Save the proposal, then approve it separately.'
              : '1 · Planning. Nothing is sent to an ad platform.'}
          </DialogDescription>
        </DialogHeader>
        {options?.reason && (
          <p className="rounded-lg bg-[#f8f8f8] p-3 text-sm text-[#636363]">
            Reason: {options.reason}
          </p>
        )}
        {review ? (
          <>
            <DraftSummary draft={review} />
            <p className="text-sm text-[#636363]">
              This creates a local{' '}
              {options?.campaignId ? 'budget request' : 'campaign draft'} that
              needs separate human approval. Planning bounds: $10–$1,000/day,
              not account guardrails. Publishing is unavailable.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                className="mt-1 accent-[#161616]"
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I reviewed this proposal. Saving does not publish or spend.
            </label>
            <ErrorNotice error={save.error} />
            <div className="flex justify-end gap-2">
              <button
                className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50"
                disabled={save.isPending}
                onClick={() => {
                  setReview(null);
                  setConfirmed(false);
                }}
              >
                Back to edit
              </button>
              <button
                className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
                disabled={!confirmed || save.isPending}
                onClick={() => save.mutate(review)}
              >
                {save.isPending ? 'Saving…' : 'Save draft for approval'}
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={form.handleSubmit((v) => setReview(v))}
            className="grid gap-4"
          >
            <label className="text-sm font-medium">
              Campaign name
              <input
                {...form.register('name')}
                className={inputClass}
                placeholder="e.g. Autumn essentials · Prospecting"
                aria-invalid={!!form.formState.errors.name}
              />
              <span role="alert" className="text-xs text-red-700">
                {form.formState.errors.name?.message}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium">
                Platform
                <select
                  {...form.register('channel')}
                  className={inputClass}
                  disabled={!!options?.campaignId}
                >
                  <option>Meta</option>
                  <option>Google</option>
                  <option>TikTok</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Objective
                <select {...form.register('objective')} className={inputClass}>
                  <option>Sales</option>
                  <option>Leads</option>
                  <option>Traffic</option>
                </select>
              </label>
            </div>
            <label className="text-sm font-medium">
              Proposed daily budget (USD)
              <input
                {...form.register('dailyBudget', { valueAsNumber: true })}
                type="number"
                min="10"
                max="1000"
                step="0.01"
                className={inputClass}
                aria-invalid={!!form.formState.errors.dailyBudget}
              />
              <span role="alert" className="text-xs text-red-700">
                {form.formState.errors.dailyBudget?.message}
              </span>
              <span className="mt-1 block text-xs font-normal text-[#636363]">
                $10–$1,000/day. Planning only, with no immediate spend.
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
                type="submit"
              >
                Review draft
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
function LaunchBrief({ onReview }: { onReview: (values: DraftInput) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DraftInput>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      name: '',
      channel: 'Meta',
      objective: 'Sales',
      dailyBudget: 100,
    },
  });
  const field =
    'mt-1 h-12 w-full rounded-2xl border border-[#e0e0e0] bg-white px-5 outline-none hover:border-[#cccccc] focus:border-[#9e9e9e]';
  return (
    <div className="grid grid-cols-[minmax(0,640px)_minmax(280px,1fr)] gap-8 max-lg:grid-cols-1">
      <form
        onSubmit={handleSubmit(onReview)}
        className="rounded-3xl border border-[#e8e8e8] p-6"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#fff0a2]">
            <Rocket className="size-5" />
          </span>
          <div>
            <h2 className="text-[24px] font-semibold">Campaign brief</h2>
            <p className="text-[13px] text-[#636363]">
              1 · Planning. Saved on this device, not an ad platform.
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
            Proposed daily budget (USD)
            <input
              {...register('dailyBudget', { valueAsNumber: true })}
              type="number"
              min="10"
              max="1000"
              step="0.01"
              className={field}
              aria-invalid={Boolean(errors.dailyBudget)}
            />
            <span
              role="alert"
              className="mt-1 block text-[13px] font-normal text-[#cd2823]"
            >
              {errors.dailyBudget?.message}
            </span>
          </label>
        </div>
        <button
          type="submit"
          className="mt-6 h-12 w-full rounded-full bg-[#161616] text-[18px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
        >
          Review campaign draft
        </button>
      </form>
      <aside className="rounded-3xl bg-[#f8f8f8] p-6">
        <Wand2 className="size-5 text-[#636363]" />
        <h2 className="mt-4 text-[18px] font-semibold">Draft workflow</h2>
        <ol
          className="mt-4 grid gap-4 text-[#636363]"
          aria-label="Campaign draft stages"
        >
          <li aria-current="step">
            <strong className="text-[#161616]">1 · Planning</strong>
            <p className="mt-1 text-sm">
              Name, channel, objective, and $10–$1,000/day proposal.
            </p>
          </li>
          <li>
            <strong>2 · Review</strong>
            <p className="mt-1 text-sm">
              Check the details and save a local draft.
            </p>
          </li>
          <li>
            <strong>3 · Approval</strong>
            <p className="mt-1 text-sm">
              Confirm separately. Approval records your decision only.
            </p>
          </li>
          <li>
            <strong>4 · Publishing unavailable</strong>
            <p className="mt-1 text-sm">
              Not implemented. Approved drafts cannot run or spend.
            </p>
          </li>
        </ol>
      </aside>
    </div>
  );
}

export function DraftsView({ workspaceId }: { workspaceId: string }) {
  const query = useQuery({
    queryKey: ['drafts', workspaceId],
    queryFn: ({ signal }) => demoApi.getDrafts(workspaceId, signal),
  });
  const [briefVersion, setBriefVersion] = useState(0);
  const [creating, setCreating] = useState<DraftInput | null>(null),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [status, setStatus] = useState('all'),
    [success, setSuccess] = useState('');
  const refresh = useRefreshPerformance(workspaceId);
  const approve = useMutation({
    mutationFn: (id: string) => demoApi.approveDraft(id, workspaceId),
    onSuccess: async (draft) => {
      await refresh();
      setConfirmed(false);
      setSuccess(
        `${draft.name} was approved locally. It remains unpublished and cannot spend.`,
      );
    },
  });
  const selected = query.data?.find((d) => d.id === selectedId);
  const approvalActionRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (selected?.approval === 'Approved locally') {
      approvalActionRef.current?.focus();
    }
  }, [selected?.id, selected?.approval]);
  const rows = (query.data ?? []).filter(
    (d) => status === 'all' || d.approval === status,
  );
  return (
    <>
      <LaunchBrief key={briefVersion} onReview={setCreating} />
      <h2 className="mb-5 mt-8 text-[18px] font-semibold">
        Saved drafts and approvals
      </h2>
      {success && <SuccessNotice>{success}</SuccessNotice>}
      <div className="mb-4">
        <label className="text-sm text-[#636363]">
          Approval status
          <select
            className={`${inputClass} max-w-[240px]`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All drafts</option>
            <option>Needs review</option>
            <option>Approved locally</option>
          </select>
        </label>
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
      ) : !rows.length ? (
        <EmptyState title="No drafts here yet">
          {status === 'all'
            ? 'Create a draft to plan a campaign safely. Saved drafts stay in this browser and workspace.'
            : 'No drafts match this approval status.'}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e8e8e8] divide-y divide-[#e8e8e8] overflow-hidden">
          {rows.map((d) => (
            <article
              key={d.id}
              className="flex flex-wrap items-center gap-4 p-5"
            >
              <FileText className="size-5 shrink-0 text-[#9e9e9e]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{d.name}</h2>
                  <span className="inline-flex items-center rounded-full font-semibold bg-[#f2f2f2] px-2 py-1 text-xs text-[#636363]">
                    {d.approval}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#636363]">
                  {d.kind === 'budget' ? 'Budget request' : 'Campaign draft'} ·{' '}
                  {d.channel} · {currency.format(d.dailyBudget)}/day proposed
                </p>
                <p className="mt-1 text-xs text-[#9e9e9e]">
                  Saved {new Date(d.updatedAt).toLocaleString()} · not published
                </p>
              </div>
              <button
                className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50"
                onClick={() => {
                  setSelectedId(d.id);
                  setConfirmed(false);
                  approve.reset();
                }}
              >
                {d.approval === 'Needs review'
                  ? 'Review draft'
                  : 'View approval'}
              </button>
            </article>
          ))}
        </div>
      )}
      {creating && (
        <DraftEditor
          workspaceId={workspaceId}
          initial={creating}
          startInReview
          onClose={() => setCreating(null)}
          onSaved={(d) => {
            setSuccess(`${d.name} saved for approval. Publishing is unavailable.`);
            setStatus('all');
            setBriefVersion((version) => version + 1);
            setSelectedId(d.id);
            setConfirmed(false);
            approve.reset();
          }}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !approve.isPending) setSelectedId(null);
        }}
      >
        <DialogContent
          showCloseButton={!approve.isPending}
          className="max-h-[90dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-[560px]"
        >
          <DialogHeader>
            <DialogTitle className="text-[24px] font-semibold leading-7">
              {selected?.approval === 'Approved locally'
                ? 'Local approval record'
                : 'Review and approve locally'}
            </DialogTitle>
            <DialogDescription>
              3 · Approval. Records your decision locally. Publishing is
              unavailable; no budget is applied.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <DraftSummary draft={selected} />
              {selected.reason && (
                <p className="text-sm text-[#636363]">
                  Reason: {selected.reason}
                </p>
              )}
              {selected.approval === 'Needs review' ? (
                <>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#161616]"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I approve this local proposal. No ads or spend will start.
                  </label>
                  <ErrorNotice error={approve.error} />
                  <button
                    className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
                    disabled={!confirmed || approve.isPending}
                    onClick={() => approve.mutate(selected.id)}
                  >
                    {approve.isPending
                      ? 'Recording approval…'
                      : 'Approve locally'}
                  </button>
                </>
              ) : (
                <>
                  <SuccessNotice>
                    Approved locally{' '}
                    {selected.approvedAt
                      ? new Date(selected.approvedAt).toLocaleString()
                      : ''}
                    . Publishing is unavailable. No ad account was changed.
                  </SuccessNotice>
                  <Link
                    ref={approvalActionRef}
                    to="/workspaces/$workspaceId/performance/activity"
                    params={{ workspaceId }}
                    className="inline-flex h-9 items-center justify-center rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e]"
                  >
                    View activity
                  </Link>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
