import type {
  ActivityItem,
  AutomationRule,
  Campaign,
  ChatSummary,
  DashboardData,
  DashboardFilters,
  Suggestion,
  Workspace,
} from '@/src/lib/types';
import { compactCurrency, compactNumber } from '@/src/lib/formatters';

const wait = (signal?: AbortSignal, duration = 260) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, duration);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('Request cancelled', 'AbortError'));
      },
      { once: true },
    );
  });

const workspaces: Workspace[] = [
  {
    id: 'demo',
    name: 'Atlas Commerce',
    initials: 'AC',
    accent: '#91e5b2',
    accountCount: 4,
  },
  {
    id: 'north',
    name: 'North Goods',
    initials: 'NG',
    accent: '#a9d8ff',
    accountCount: 2,
  },
  {
    id: 'studio',
    name: 'Sunday Studio',
    initials: 'SS',
    accent: '#dac7ff',
    accountCount: 3,
  },
];

const baseCampaigns: Campaign[] = [
  {
    id: 'cmp-1',
    status: 'Active',
    name: 'US · Prospecting · Advantage+',
    channel: 'Meta',
    spend: 18430,
    revenue: 62192,
    roas: 3.37,
    cpa: 24.2,
    conversions: 762,
    updatedAt: '4 min ago',
  },
  {
    id: 'cmp-2',
    status: 'Active',
    name: 'Brand search · Always on',
    channel: 'Google',
    spend: 8860,
    revenue: 38710,
    roas: 4.37,
    cpa: 17.3,
    conversions: 512,
    updatedAt: '7 min ago',
  },
  {
    id: 'cmp-3',
    status: 'Paused',
    name: 'Spring drop · Retargeting',
    channel: 'Meta',
    spend: 6355,
    revenue: 15302,
    roas: 2.41,
    cpa: 31.8,
    conversions: 200,
    updatedAt: '21 min ago',
  },
  {
    id: 'cmp-4',
    status: 'Active',
    name: 'Creator mix · Broad',
    channel: 'TikTok',
    spend: 7210,
    revenue: 17954,
    roas: 2.49,
    cpa: 28.4,
    conversions: 254,
    updatedAt: '32 min ago',
  },
  {
    id: 'cmp-5',
    status: 'Active',
    name: 'Shopping · High intent',
    channel: 'Google',
    spend: 11405,
    revenue: 40502,
    roas: 3.55,
    cpa: 21.9,
    conversions: 521,
    updatedAt: '38 min ago',
  },
  {
    id: 'cmp-6',
    status: 'Draft',
    name: 'EU · Summer launch',
    channel: 'Meta',
    spend: 0,
    revenue: 0,
    roas: 0,
    cpa: 0,
    conversions: 0,
    updatedAt: '1 hr ago',
  },
  {
    id: 'cmp-7',
    status: 'Paused',
    name: 'UGC test · Iteration 03',
    channel: 'TikTok',
    spend: 3218,
    revenue: 6590,
    roas: 2.05,
    cpa: 36.6,
    conversions: 88,
    updatedAt: '2 hr ago',
  },
  {
    id: 'cmp-8',
    status: 'Active',
    name: 'Catalog sales · Returning',
    channel: 'Meta',
    spend: 9980,
    revenue: 33264,
    roas: 3.33,
    cpa: 22.5,
    conversions: 443,
    updatedAt: '3 hr ago',
  },
  {
    id: 'cmp-9',
    status: 'Active',
    name: 'Non-brand search · Core',
    channel: 'Google',
    spend: 4820,
    revenue: 13605,
    roas: 2.82,
    cpa: 26.5,
    conversions: 182,
    updatedAt: '4 hr ago',
  },
  {
    id: 'cmp-10',
    status: 'Paused',
    name: 'Lookalike · Purchasers 2%',
    channel: 'Meta',
    spend: 5680,
    revenue: 12395,
    roas: 2.18,
    cpa: 34.4,
    conversions: 165,
    updatedAt: 'Yesterday',
  },
  {
    id: 'cmp-11',
    status: 'Active',
    name: 'New customer · Video mix',
    channel: 'TikTok',
    spend: 5904,
    revenue: 15774,
    roas: 2.67,
    cpa: 29.8,
    conversions: 198,
    updatedAt: 'Yesterday',
  },
  {
    id: 'cmp-12',
    status: 'Draft',
    name: 'Holiday holdout · v2',
    channel: 'Google',
    spend: 0,
    revenue: 0,
    roas: 0,
    cpa: 0,
    conversions: 0,
    updatedAt: '2 days ago',
  },
];

const dashboard: DashboardData = {
  metrics: [
    {
      id: 'spend',
      label: 'Spend',
      value: 75862,
      display: '$75.9K',
      change: 8.4,
      comparison: 'vs previous 30 days',
      trend: [22, 28, 26, 35, 37, 43, 47],
    },
    {
      id: 'revenue',
      label: 'Revenue',
      value: 256288,
      display: '$256.3K',
      change: 14.2,
      comparison: 'vs previous 30 days',
      trend: [18, 24, 31, 29, 42, 49, 58],
    },
    {
      id: 'roas',
      label: 'ROAS',
      value: 3.38,
      display: '3.38×',
      change: 5.3,
      comparison: 'vs previous 30 days',
      trend: [28, 30, 26, 35, 40, 38, 45],
    },
    {
      id: 'conversions',
      label: 'Conversions',
      value: 3325,
      display: '3,325',
      change: -2.1,
      comparison: 'vs previous 30 days',
      trend: [40, 38, 42, 37, 35, 34, 36],
    },
  ],
  series: [
    { date: 'Aug 08', spend: 2050, revenue: 6510 },
    { date: 'Aug 10', spend: 2210, revenue: 7020 },
    { date: 'Aug 12', spend: 2130, revenue: 7360 },
    { date: 'Aug 14', spend: 2450, revenue: 7750 },
    { date: 'Aug 16', spend: 2310, revenue: 8160 },
    { date: 'Aug 18', spend: 2620, revenue: 8790 },
    { date: 'Aug 20', spend: 2510, revenue: 8530 },
    { date: 'Aug 22', spend: 2740, revenue: 9250 },
    { date: 'Aug 24', spend: 2670, revenue: 8870 },
    { date: 'Aug 26', spend: 2890, revenue: 9820 },
    { date: 'Aug 28', spend: 2790, revenue: 10120 },
    { date: 'Aug 30', spend: 3010, revenue: 10440 },
    { date: 'Sep 01', spend: 2930, revenue: 10980 },
    { date: 'Sep 03', spend: 3220, revenue: 11270 },
    { date: 'Sep 05', spend: 3140, revenue: 11880 },
  ],
  channelMix: [
    { channel: 'Meta', share: 54, color: '#734ede' },
    { channel: 'Google', share: 31, color: '#45b97c' },
    { channel: 'TikTok', share: 15, color: '#87dde1' },
  ],
  opportunities: [
    {
      id: 'o1',
      title: 'Catalog sales is gaining efficiency',
      detail: 'ROAS rose 18% while spend stayed within its daily guardrail.',
      tone: 'good',
    },
    {
      id: 'o2',
      title: 'Retargeting frequency is elevated',
      detail:
        'Frequency reached 4.8 in the last seven days. Refresh creative soon.',
      tone: 'watch',
    },
    {
      id: 'o3',
      title: 'Three campaigns are pacing under budget',
      detail: 'Aster can redistribute up to $420/day with your approval.',
      tone: 'good',
    },
  ],
};

const suggestions: Suggestion[] = [
  {
    id: 's1',
    label: 'Find wasted spend',
    prompt:
      'Review the last 30 days and identify campaigns spending above target CPA without enough conversions.',
    category: 'suggested',
  },
  {
    id: 's2',
    label: 'Summarize this week',
    prompt:
      'Give me an executive summary of performance this week compared with the previous week.',
    category: 'suggested',
  },
  {
    id: 's3',
    label: 'Show scaling opportunities',
    prompt:
      'Find campaigns with stable CPA and enough conversion volume that are ready for a careful budget increase.',
    category: 'suggested',
  },
  {
    id: 'm1',
    label: 'Audit Meta campaign structure',
    prompt:
      'Audit my active Meta campaigns for audience overlap, fragmented budgets, and naming inconsistencies.',
    category: 'meta',
  },
  {
    id: 'm2',
    label: 'Prepare a safe budget change',
    prompt:
      'Draft a 15% budget increase for eligible Meta campaigns, including the expected impact and rollback conditions.',
    category: 'meta',
  },
  {
    id: 'm3',
    label: 'Check creative fatigue',
    prompt:
      'Check active Meta ads for creative fatigue using frequency, CTR trend, and CPA trend.',
    category: 'meta',
  },
];

const rules: AutomationRule[] = [
  {
    id: 'r1',
    name: 'Protect prospecting CPA',
    condition: 'CPA above $35 for 3 days',
    action: 'Reduce daily budget by 15%',
    status: 'Running',
    lastRun: '12 min ago',
  },
  {
    id: 'r2',
    name: 'Scale consistent winners',
    condition: 'ROAS above 3.5 and 20+ sales',
    action: 'Increase daily budget by 10%',
    status: 'Running',
    lastRun: '1 hr ago',
  },
  {
    id: 'r3',
    name: 'Fatigue alert',
    condition: 'Frequency above 4.5',
    action: 'Notify workspace owners',
    status: 'Paused',
    lastRun: 'Yesterday',
  },
];

const activity: ActivityItem[] = [
  {
    id: 'a1',
    title: 'Budget guardrail applied',
    detail:
      'Aster reduced Spring drop · Retargeting by 15% after CPA exceeded $35.',
    time: '12 min ago',
    kind: 'agent',
  },
  {
    id: 'a2',
    title: 'Campaign resumed',
    detail:
      'US · Prospecting · Advantage+ resumed after its payment issue cleared.',
    time: '43 min ago',
    kind: 'campaign',
  },
  {
    id: 'a3',
    title: 'Creative fatigue detected',
    detail:
      'Two ads crossed the frequency threshold in Catalog sales · Returning.',
    time: '2 hr ago',
    kind: 'alert',
  },
];

export const demoApi = {
  async getWorkspace(id: string, signal?: AbortSignal) {
    await wait(signal);
    return (
      workspaces.find((workspace) => workspace.id === id) ?? {
        ...workspaces[0],
        id,
        name: 'New Workspace',
      }
    );
  },
  async getWorkspaces(signal?: AbortSignal) {
    await wait(signal, 140);
    return workspaces;
  },
  async getChats(
    workspaceId: string,
    signal?: AbortSignal,
  ): Promise<ChatSummary[]> {
    await wait(signal, 180);
    const stored = localStorage.getItem(`aster-chats-${workspaceId}`);
    if (stored) return JSON.parse(stored) as ChatSummary[];
    return [
      {
        id: 'weekly-readout',
        title: 'Weekly performance readout',
        updatedAt: 'Today',
      },
      {
        id: 'creative-fatigue',
        title: 'Creative fatigue review',
        updatedAt: 'Yesterday',
      },
      {
        id: 'budget-plan',
        title: 'September budget plan',
        updatedAt: 'Aug 29',
      },
    ];
  },
  async createChat(workspaceId: string, title: string) {
    await wait(undefined, 180);
    const current = await this.getChats(workspaceId);
    const chat = { id: `chat-${Date.now()}`, title, updatedAt: 'Now' };
    localStorage.setItem(
      `aster-chats-${workspaceId}`,
      JSON.stringify([chat, ...current]),
    );
    return chat;
  },
  async getSuggestions(_workspaceId: string, signal?: AbortSignal) {
    await wait(signal, 160);
    return suggestions;
  },
  async sendMessage(prompt: string) {
    await wait(undefined, 720);
    return {
      id: `msg-${Date.now()}`,
      answer: `I reviewed your connected demo data for “${prompt.slice(0, 72)}${prompt.length > 72 ? '…' : ''}”. The strongest opportunity is a measured 10–15% budget increase on campaigns above 3.3× ROAS. I would keep the retargeting campaign paused until CPA returns below $30. No account changes were made.`,
    };
  },
  async getDashboard(filters: DashboardFilters, signal?: AbortSignal) {
    await wait(signal, 300);
    if (filters.demo === 'empty') {
      return {
        ...dashboard,
        metrics: [],
        series: [],
        channelMix: [],
        opportunities: [],
      };
    }
    const rangeFactor = { '7d': 0.24, '30d': 1, '90d': 2.92 }[filters.range];
    const comparison =
      filters.compare === 'year'
        ? 'vs same period last year'
        : `vs previous ${filters.range === '7d' ? '7 days' : filters.range === '30d' ? '30 days' : '90 days'}`;
    const metrics = dashboard.metrics.map((metric) => {
      const value =
        metric.id === 'roas'
          ? metric.value +
            (filters.range === '7d'
              ? -0.17
              : filters.range === '90d'
                ? 0.06
                : 0)
          : metric.value * rangeFactor;
      const display =
        metric.id === 'roas'
          ? `${value.toFixed(2)}×`
          : metric.id === 'conversions'
            ? compactNumber.format(value)
            : compactCurrency.format(value);
      return {
        ...metric,
        value,
        display,
        change: metric.change + (filters.compare === 'year' ? 3.1 : 0),
        comparison,
      };
    });
    return { ...dashboard, metrics };
  },
  async getCampaigns(filters: DashboardFilters, signal?: AbortSignal) {
    await wait(signal, 300);
    if (filters.demo === 'empty') return [];
    return baseCampaigns.filter(
      (campaign) =>
        (filters.channel === 'All channels' ||
          campaign.channel === filters.channel) &&
        (filters.status === 'All statuses' ||
          campaign.status === filters.status) &&
        campaign.name.toLowerCase().includes(filters.search.toLowerCase()),
    );
  },
  async updateCampaign(id: string, status: Campaign['status']) {
    await wait(undefined, 320);
    return { id, status };
  },
  async createCampaign(input: {
    name: string;
    channel: string;
    objective: string;
    dailyBudget: number;
  }) {
    await wait(undefined, 520);
    return { id: `campaign-${Date.now()}`, ...input, status: 'Draft' as const };
  },
  async getRules(demo: 'empty' | 'populated', signal?: AbortSignal) {
    await wait(signal);
    return demo === 'empty' ? [] : rules;
  },
  async getActivity(demo: 'empty' | 'populated', signal?: AbortSignal) {
    await wait(signal);
    return demo === 'empty' ? [] : activity;
  },
  async getBusinessContext(workspaceId: string, signal?: AbortSignal) {
    await wait(signal, 140);
    return (
      localStorage.getItem(`aster-context-${workspaceId}`) ??
      'Atlas Commerce sells everyday travel essentials across North America. Our main goal is profitable new-customer growth while keeping blended ROAS above 3.0×.'
    );
  },
  async saveBusinessContext(workspaceId: string, value: string) {
    await wait(undefined, 280);
    localStorage.setItem(`aster-context-${workspaceId}`, value);
    return value;
  },
  async connectFolders(workspaceId: string, folders: string[]) {
    await wait(undefined, 420);
    localStorage.setItem(`aster-stage-${workspaceId}`, JSON.stringify(folders));
    return folders;
  },
  async createGateway(input: {
    name: string;
    platform: string;
    region: string;
  }) {
    await wait(undefined, 480);
    const gateway = { id: `gateway-${Date.now()}`, ...input };
    localStorage.setItem('aster-gateway', JSON.stringify(gateway));
    return gateway;
  },
};
