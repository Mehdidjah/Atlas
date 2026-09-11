import { z } from 'zod';
import type {
  Campaign,
  DashboardData,
  DashboardFilters,
  DemoAudit,
  DemoDraft,
  DemoRule,
} from '@/src/lib/types';
import { compactCurrency, compactNumber } from '@/src/lib/formatters';

export const BUDGET_MIN = 10;
export const BUDGET_MAX = 1000;
export const draftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Use at least 3 characters.')
    .max(100, 'Use 100 characters or fewer.'),
  channel: z.enum(['Meta', 'Google', 'TikTok']),
  objective: z.enum(['Sales', 'Leads', 'Traffic']),
  dailyBudget: z
    .number()
    .min(BUDGET_MIN, 'Minimum is $10 per day.')
    .max(BUDGET_MAX, 'Demo limit is $1,000 per day.'),
});
export type DraftInput = z.infer<typeof draftSchema>;
export const ruleSchema = z.object({
  name: z.string().trim().min(3).max(100),
  metric: z.enum(['CPA', 'ROAS']),
  threshold: z.number().min(0.1).max(1000),
});
export type RuleInput = z.infer<typeof ruleSchema>;
const savedDraftSchema = draftSchema.extend({
  id: z.string(),
  status: z.literal('Draft'),
  approval: z.enum(['Needs review', 'Approved locally']),
  kind: z.enum(['campaign', 'budget']),
  campaignId: z.string().optional(),
  reason: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  approvedAt: z.number().optional(),
});
const savedRuleSchema = ruleSchema.extend({
  id: z.string(),
  condition: z.string(),
  action: z.string(),
  status: z.literal('Paused'),
  lastRun: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
const auditSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  time: z.string(),
  kind: z.enum(['agent', 'campaign', 'alert']),
  createdAt: z.number(),
  actor: z.enum(['user', 'assistant']),
  action: z.enum(['draft', 'approval', 'status', 'rule']),
  entityId: z.string(),
});
const storeSchema = z.object({
  version: z.literal(1),
  drafts: z.array(savedDraftSchema),
  rules: z.array(savedRuleSchema),
  statuses: z.record(
    z.string(),
    z.object({
      status: z.enum(['Active', 'Paused', 'Draft']),
      updatedAt: z.number(),
    }),
  ),
  audit: z.array(auditSchema),
});
type Store = z.infer<typeof storeSchema>;
const storageKey = (id: string) =>
  `aster-performance-v1-${encodeURIComponent(id)}`;
function read(id = 'demo'): Store {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw
      ? storeSchema.parse(JSON.parse(raw))
      : { version: 1, drafts: [], rules: [], statuses: {}, audit: [] };
  } catch {
    throw new Error(
      'Saved demo data could not be read. Browser storage may be blocked or invalid. No changes were made.',
    );
  }
}
function write(id: string, state: Store) {
  try {
    localStorage.setItem(
      storageKey(id),
      JSON.stringify(storeSchema.parse(state)),
    );
  } catch {
    throw new Error(
      'Could not save this demo change. Check browser storage permissions or free space and try again.',
    );
  }
}
function audit(
  state: Store,
  entityId: string,
  action: DemoAudit['action'],
  title: string,
  detail: string,
  actor: DemoAudit['actor'] = 'user',
) {
  state.audit.unshift({
    id: crypto.randomUUID(),
    entityId,
    action,
    title,
    detail,
    actor,
    kind: actor === 'assistant' ? 'agent' : 'campaign',
    time: 'Saved locally',
    createdAt: Date.now(),
  });
}
const seeds: Array<
  [string, Campaign['channel'], Campaign['status'], number, number, number]
> = [
  ['US · Prospecting · Advantage+', 'Meta', 'Active', 18430, 62192, 762],
  ['Brand search · Always on', 'Google', 'Active', 8860, 38710, 512],
  ['Spring drop · Retargeting', 'Meta', 'Paused', 6355, 15302, 200],
  ['Creator mix · Broad', 'TikTok', 'Active', 7210, 17954, 254],
  ['Shopping · High intent', 'Google', 'Active', 11405, 40502, 521],
  ['EU · Summer launch', 'Meta', 'Draft', 0, 0, 0],
  ['UGC test · Iteration 03', 'TikTok', 'Paused', 3218, 6590, 88],
  ['Catalog sales · Returning', 'Meta', 'Active', 9980, 33264, 443],
  ['Non-brand search · Core', 'Google', 'Active', 4820, 13605, 182],
  ['Lookalike · Purchasers 2%', 'Meta', 'Paused', 5680, 12395, 165],
  ['New customer · Video mix', 'TikTok', 'Active', 5904, 15774, 198],
  ['Holiday holdout · v2', 'Google', 'Draft', 0, 0, 0],
];
// Fixed UTC endpoint: deterministic, synthetic daily history, never live reporting.
export const FIXTURE_END = Date.UTC(2026, 8, 5);
const DAY = 86400000;
const round = (n: number) => Math.round(n * 100) / 100;
export function performanceDataset(
  filters: DashboardFilters,
  workspaceId = 'demo',
  offset = 0,
) {
  const state = read(workspaceId);
  const days = Number.parseInt(filters.range);
  const base =
    filters.demo === 'empty'
      ? []
      : seeds.map(
          ([name, channel, status, spend, revenue, conversions], i) => ({
            id: `cmp-${i + 1}`,
            name,
            channel,
            status,
            spend,
            revenue,
            conversions,
            seed: i,
          }),
        );
  const local = state.drafts
    .filter((d) => d.kind === 'campaign')
    .map((d) => ({
      id: d.id,
      name: d.name,
      channel: d.channel,
      status: 'Draft' as const,
      spend: 0,
      revenue: 0,
      conversions: 0,
      seed: 0,
    }));
  const matching = [...base, ...local]
    .map((c) => ({ ...c, status: state.statuses[c.id]?.status ?? c.status }))
    .filter(
      (c) =>
        (filters.channel === 'All channels' || c.channel === filters.channel) &&
        (filters.status === 'All statuses' || c.status === filters.status) &&
        c.name.toLowerCase().includes(filters.search.trim().toLowerCase()),
    );
  const series = Array.from({ length: days }, (_, index) => ({
    date: new Date(FIXTURE_END - (days - 1 - index + offset) * DAY)
      .toISOString()
      .slice(0, 10),
    spend: 0,
    revenue: 0,
    conversions: 0,
  }));
  const campaigns: Campaign[] = matching.map((c) => {
    let spend = 0,
      revenue = 0,
      conversions = 0;
    series.forEach((point, i) => {
      const t = days - 1 - i + offset;
      const wave =
        0.88 +
        0.19 * Math.sin((t + c.seed * 3) * 0.47) +
        0.13 * Math.cos((t + c.seed) * 0.17);
      const efficiency = 0.95 + 0.09 * Math.cos((t + c.seed * 2) * 0.21);
      const s = round((c.spend / 30) * wave),
        r = round((c.revenue / 30) * wave * efficiency),
        n = Math.round((c.conversions / 30) * wave * efficiency);
      spend += s;
      revenue += r;
      conversions += n;
      point.spend = round(point.spend + s);
      point.revenue = round(point.revenue + r);
      point.conversions += n;
    });
    return {
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      spend: round(spend),
      revenue: round(revenue),
      conversions,
      roas: spend ? revenue / spend : 0,
      cpa: conversions ? spend / conversions : 0,
      updatedAt: state.statuses[c.id]
        ? new Date(state.statuses[c.id].updatedAt).toLocaleString()
        : 'Synthetic fixture',
    };
  });
  return { campaigns, series: matching.length ? series : [] };
}
function totals(rows: Campaign[]) {
  const spend = round(rows.reduce((n, c) => n + c.spend, 0)),
    revenue = round(rows.reduce((n, c) => n + c.revenue, 0)),
    conversions = rows.reduce((n, c) => n + c.conversions, 0);
  return {
    spend,
    revenue,
    conversions,
    roas: spend ? revenue / spend : 0,
    cpa: conversions ? spend / conversions : 0,
  };
}
export function dashboardData(
  filters: DashboardFilters,
  workspaceId = 'demo',
): DashboardData & { cpa: number } {
  const current = performanceDataset(filters, workspaceId);
  const previous = performanceDataset(
    filters,
    workspaceId,
    filters.compare === 'year' ? 365 : Number.parseInt(filters.range),
  );
  const total = totals(current.campaigns),
    prior = totals(previous.campaigns);
  const comparison =
    filters.compare === 'year'
      ? 'vs synthetic prior year'
      : `vs previous ${Number.parseInt(filters.range)} sample days`;
  const metrics: DashboardData['metrics'] = (
    ['spend', 'revenue', 'roas', 'conversions'] as const
  ).map((id) => ({
    id,
    label: {
      spend: 'Ad spend',
      revenue: 'Revenue',
      roas: 'Return on ad spend',
      conversions: 'Conversions',
    }[id],
    value: total[id],
    display:
      id === 'roas'
        ? `${total[id].toFixed(2)}×`
        : id === 'conversions'
          ? compactNumber.format(total[id])
          : compactCurrency.format(total[id]),
    change: prior[id] ? ((total[id] - prior[id]) / prior[id]) * 100 : 0,
    comparison,
    trend: current.series.map((p) =>
      id === 'roas' ? (p.spend ? p.revenue / p.spend : 0) : p[id],
    ),
  }));
  return {
    metrics: current.campaigns.length ? metrics : [],
    series: current.series,
    cpa: total.cpa,
    channelMix: ['Meta', 'Google', 'TikTok'].map((channel, i) => ({
      channel,
      share: total.spend
        ? (current.campaigns
            .filter((c) => c.channel === channel)
            .reduce((n, c) => n + c.spend, 0) /
            total.spend) *
          100
        : 0,
      color: ['#734ede', '#888093', '#b5adc2'][i],
    })),
    opportunities: current.campaigns
      .filter((c) => c.spend > 0 && c.status === 'Active')
      .sort((a, b) => b.cpa - a.cpa)
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        title: `Review ${c.name}`,
        detail: `Sample CPA is $${c.cpa.toFixed(2)} with ${c.conversions} conversions and ${c.roas.toFixed(2)}× ROAS. Compare creative and audience quality before changing budget.`,
        tone: c.roas >= 3 ? 'good' : 'watch',
      })),
  };
}
export const performanceStore = {
  drafts: (workspaceId = 'demo'): DemoDraft[] =>
    read(workspaceId).drafts.sort((a, b) => b.updatedAt - a.updatedAt),
  rules: (workspaceId = 'demo'): DemoRule[] =>
    read(workspaceId).rules.sort((a, b) => b.updatedAt - a.updatedAt),
  activity: (workspaceId = 'demo'): DemoAudit[] =>
    read(workspaceId).audit.sort((a, b) => b.createdAt - a.createdAt),
  saveDraft(
    input: DraftInput,
    workspaceId = 'demo',
    options?: { campaignId?: string; reason?: string; assistant?: boolean },
  ) {
    const values = draftSchema.parse(input),
      state = read(workspaceId),
      now = Date.now();
    if (
      options?.campaignId &&
      !seeds.some((_, i) => `cmp-${i + 1}` === options.campaignId)
    )
      throw new Error('This sample campaign is no longer available.');
    const draft: DemoDraft = {
      ...values,
      id: `draft-${crypto.randomUUID()}`,
      status: 'Draft',
      approval: 'Needs review',
      kind: options?.campaignId ? 'budget' : 'campaign',
      campaignId: options?.campaignId,
      reason: options?.reason,
      createdAt: now,
      updatedAt: now,
    };
    state.drafts.unshift(draft);
    if (options?.assistant)
      audit(
        state,
        draft.id,
        'draft',
        'Assistant suggestion prepared',
        `${draft.name}: ${options.reason ?? 'Sample performance review'}. Preparation requested by the user; no ad changes.`,
        'assistant',
      );
    audit(
      state,
      draft.id,
      'draft',
      draft.kind === 'budget' ? 'Budget request saved' : 'Campaign draft saved',
      `${draft.name} · ${draft.channel} · ${draft.objective} · $${draft.dailyBudget}/day proposed. Needs human review. No spend enabled.`,
    );
    write(workspaceId, state);
    return draft;
  },
  approve(id: string, workspaceId = 'demo') {
    const state = read(workspaceId),
      draft = state.drafts.find((d) => d.id === id);
    if (!draft) throw new Error('Draft not found in this workspace.');
    if (draft.approval === 'Approved locally')
      throw new Error('This draft is already approved locally.');
    draft.approval = 'Approved locally';
    draft.approvedAt = Date.now();
    draft.updatedAt = draft.approvedAt;
    audit(
      state,
      id,
      'approval',
      'Draft approved locally',
      `${draft.name} · $${draft.dailyBudget}/day proposal approved by you in demo only. Still a draft; not published and no spend enabled.`,
    );
    write(workspaceId, state);
    return draft;
  },
  updateStatus(id: string, status: Campaign['status'], workspaceId = 'demo') {
    const state = read(workspaceId),
      seed = seeds.find((_, i) => `cmp-${i + 1}` === id);
    if (!seed || seed[2] === 'Draft' || status === 'Draft')
      throw new Error(
        'Drafts cannot be activated. Review a draft in Drafts & approvals.',
      );
    const old = state.statuses[id]?.status ?? seed[2];
    if (old === status)
      throw new Error('Status has already changed. Refresh and review again.');
    state.statuses[id] = { status, updatedAt: Date.now() };
    audit(
      state,
      id,
      'status',
      'Sample campaign status changed',
      `${seed[0]}: ${old} → ${status}. Confirmed by you. Local label only; no delivery or spend changed.`,
    );
    write(workspaceId, state);
    return { id, status };
  },
  saveRule(input: RuleInput, workspaceId = 'demo', id?: string) {
    const values = ruleSchema.parse(input),
      state = read(workspaceId),
      existing = id ? state.rules.find((r) => r.id === id) : undefined;
    if (id && !existing) throw new Error('Rule draft not found.');
    const rule: DemoRule = {
      ...values,
      id: existing?.id ?? `rule-${crypto.randomUUID()}`,
      status: 'Paused',
      condition: `${values.metric} ${values.metric === 'CPA' ? 'above' : 'below'} ${values.threshold} for 3 days`,
      action: 'Prepare a review request only',
      lastRun: 'Never run · draft only',
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    state.rules = [rule, ...state.rules.filter((r) => r.id !== rule.id)];
    audit(
      state,
      rule.id,
      'rule',
      existing ? 'Rule draft updated' : 'Rule draft saved',
      `${rule.name}: ${rule.condition}. Proposed action: request human review. Automation is not enabled.`,
    );
    write(workspaceId, state);
    return rule;
  },
};
