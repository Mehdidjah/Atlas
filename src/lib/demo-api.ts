import type {
  Campaign,
  ChatSummary,
  DashboardFilters,
  Suggestion,
  Workspace,
} from '@/src/lib/types';
import {
  dashboardData,
  performanceDataset,
  performanceStore,
  type DraftInput,
  type RuleInput,
} from '@/src/features/performance/performance-store';

const wait = (signal?: AbortSignal, duration = 260) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Request cancelled', 'AbortError'));
      return;
    }
    const abort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Request cancelled', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, duration);
    signal?.addEventListener('abort', abort, { once: true });
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

const suggestions: Suggestion[] = [
  {
    id: 's1',
    label: 'Plan my first campaign',
    prompt:
      'Help me plan my first campaign: objective, audience, creative, budget cap and a review checklist. What do you need to know about my business?',
    category: 'suggested',
  },
  {
    id: 's2',
    label: 'Explain sample performance',
    prompt:
      'Explain the available sample performance metrics and their period. What can and cannot be concluded from this demo data?',
    category: 'suggested',
  },
  {
    id: 's3',
    label: 'Review my budget safely',
    prompt:
      'Help me review a campaign budget safely: affordable test spend, acquisition-cost target, review date and stop conditions. Do not change any budgets.',
    category: 'suggested',
  },
  {
    id: 'm1',
    label: 'Connect my Meta account',
    prompt:
      'How do I connect Meta? Explain Aster sign-in separately from Meta advertising authorization and tell me my next setup step.',
    category: 'meta',
  },
  {
    id: 'm2',
    label: 'Choose the correct ad account',
    prompt:
      'Help me choose the correct Meta ad account for this workspace. What business details and account IDs should I check, and does saving a selection sync performance or publish ads?',
    category: 'meta',
  },
  {
    id: 'm3',
    label: 'Understand Meta permissions',
    prompt:
      'Explain the Meta permissions and business access needed to connect an ad account. What should I check if my account is missing or authorization has expired?',
    category: 'meta',
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
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (
          !Array.isArray(parsed) ||
          !parsed.every(
            (c) =>
              c &&
              typeof c.id === 'string' &&
              typeof c.title === 'string' &&
              typeof c.updatedAt === 'string',
          )
        )
          throw new Error();
        return parsed as ChatSummary[];
      } catch {
        throw new Error(
          'Saved conversations could not be read. Check browser storage and try again.',
        );
      }
    }
    return [];
  },
  async createChat(workspaceId: string, title: string) {
    await wait(undefined, 180);
    const current = await this.getChats(workspaceId);
    const chat = { id: `chat-${crypto.randomUUID()}`, title, updatedAt: 'Now' };
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
  async sendMessage(_prompt: string) {
    await wait(undefined, 720);
    return {
      id: `msg-${Date.now()}`,
      answer:
        'This is a demo response, not a live AI analysis. No ad accounts were accessed or changed. Prepare a draft for human review before considering any campaign changes.',
    };
  },
  async getDashboard(
    filters: DashboardFilters,
    signal?: AbortSignal,
    workspaceId = 'demo',
  ) {
    await wait(signal, 240);
    return dashboardData(filters, workspaceId);
  },
  async getCampaigns(
    filters: DashboardFilters,
    signal?: AbortSignal,
    workspaceId = 'demo',
  ) {
    await wait(signal, 240);
    return performanceDataset(filters, workspaceId).campaigns;
  },
  async updateCampaign(
    id: string,
    status: Campaign['status'],
    workspaceId = 'demo',
  ) {
    await wait();
    return performanceStore.updateStatus(id, status, workspaceId);
  },
  async createCampaign(
    input: {
      name: string;
      channel: string;
      objective: string;
      dailyBudget: number;
    },
    workspaceId = 'demo',
  ) {
    await wait();
    return performanceStore.saveDraft(input as DraftInput, workspaceId);
  },
  async getDrafts(workspaceId = 'demo', signal?: AbortSignal) {
    await wait(signal);
    return performanceStore.drafts(workspaceId);
  },
  async prepareBudgetRequest(
    input: DraftInput,
    workspaceId = 'demo',
    options?: { campaignId?: string; reason?: string; assistant?: boolean },
  ) {
    await wait();
    return performanceStore.saveDraft(input, workspaceId, options);
  },
  async approveDraft(id: string, workspaceId = 'demo') {
    await wait();
    return performanceStore.approve(id, workspaceId);
  },
  async getRules(
    _demo: 'empty' | 'populated',
    signal?: AbortSignal,
    workspaceId = 'demo',
  ) {
    await wait(signal);
    return performanceStore.rules(workspaceId);
  },
  async saveRule(input: RuleInput, workspaceId = 'demo', id?: string) {
    await wait();
    return performanceStore.saveRule(input, workspaceId, id);
  },
  async getActivity(
    _demo: 'empty' | 'populated',
    signal?: AbortSignal,
    workspaceId = 'demo',
  ) {
    await wait(signal);
    return performanceStore.activity(workspaceId);
  },
  async getBusinessContext(workspaceId: string, signal?: AbortSignal) {
    await wait(signal, 140);
    return localStorage.getItem(`aster-context-${workspaceId}`) ?? '';
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
