import type { DashboardData, DashboardFilters } from '@/src/lib/types';
import {
  journeyRoutes,
  type WorkspaceJourney,
} from '@/src/lib/workspace-journey';
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  status?: 'pending' | 'failed' | 'sent';
  replyToId?: string;
}
const key = (workspaceId: string, chatId: string) =>
  `aster-conversation-v1:${encodeURIComponent(workspaceId)}:${encodeURIComponent(chatId)}`;
export function readMessages(
  workspaceId: string,
  chatId?: string,
): { messages: ConversationMessage[]; error: string } {
  if (!chatId) return { messages: [], error: '' };
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(key(workspaceId, chatId)) ?? '[]',
    );
    if (
      !Array.isArray(value) ||
      !value.every(
        (message) =>
          message &&
          typeof message.id === 'string' &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string' &&
          typeof message.createdAt === 'string',
      )
    )
      throw new Error('Invalid conversation');
    return {
      messages: value.map((message) => ({
        ...message,
        status: message.status === 'pending' ? 'failed' : message.status,
      })),
      error: '',
    };
  } catch {
    return {
      messages: [],
      error:
        'Saved messages could not be read. Your browser may be blocking storage, or this conversation is damaged. New messages will stay visible in this session.',
    };
  }
}
export function saveMessages(
  workspaceId: string,
  chatId: string,
  messages: ConversationMessage[],
): string {
  try {
    localStorage.setItem(key(workspaceId, chatId), JSON.stringify(messages));
    return '';
  } catch {
    return 'Messages are visible in this session but could not be saved in this browser. Keep this tab open to retain them.';
  }
}
export type AssistantIntent =
  | 'identity'
  | 'meta-connect'
  | 'account-selection'
  | 'permissions'
  | 'publishing'
  | 'performance'
  | 'budget'
  | 'creative'
  | 'campaign-planning'
  | 'general';

export type AssistantPlanningContext = Pick<
  WorkspaceJourney,
  | 'phase'
  | 'signedIn'
  | 'metaReady'
  | 'selectedCount'
  | 'action'
  | 'routes'
  | 'capabilities'
> & {
  /** Reporting and local drafts stay in the current workspace, not the connection workspace. */
  dataWorkspaceId?: string;
  sampleFilters?: Pick<
    DashboardFilters,
    'range' | 'channel' | 'status' | 'search'
  >;
};
type AssistantRoute =
  WorkspaceJourney['routes'][keyof WorkspaceJourney['routes']];
export interface AssistantNextAction {
  label: string;
  detail: string;
  route?: AssistantRoute;
}

/** Intent routing is deterministic; mentioning Meta alone does not imply account setup. */
export function classifyAssistantIntent(prompt: string): AssistantIntent {
  const question = prompt.toLowerCase();
  const selection =
    /\b(select|choose|pick|switch|wrong|correct|right|which)\b[^.!?]*\baccounts?\b|\bad account (selection|id)\b/.test(
      question,
    );
  const permissions =
    /\b(permissions?|access denied|missing access|business admin|administrator|scopes?)\b/.test(
      question,
    );
  const connection =
    /\b(connect|connecting|reconnect|reconnecting|connection|authorize|authorization|oauth)\b/.test(
      question,
    ) ||
    (/\b(setup|set up)\b/.test(question) &&
      (!/\bcampaigns?\b/.test(question) ||
        /\b(meta|accounts?)\b/.test(question)));
  const identity =
    /\b(sign[ -]?up|sign[ -]?in|log[ -]?in|register|password|aster account|identity)\b/.test(
      question,
    );
  const execution = /\b(publish|approve|pause|resume|delete|activate)\b/.test(
    question,
  );
  const directExecution =
    /^(?:please\s+)?(?:publish|approve|pause|resume|delete|activate)\b|\b(?:can|could|would|will) you (?:please )?(?:publish|approve|pause|resume|delete|activate)\b/.test(
      question.trim(),
    );
  if (
    directExecution ||
    (execution && !selection && !permissions && !connection && !identity)
  )
    return 'publishing';
  if (selection) return 'account-selection';
  if (permissions) return 'permissions';
  if (connection) return 'meta-connect';
  if (identity || /\b(create|open)\b[^.!?]*\baccount\b/.test(question))
    return 'identity';
  if (
    /\blaunch\b/.test(question) &&
    !/\b(plan|planning|first|how|help|prepare)\b/.test(question)
  )
    return 'publishing';
  if (
    /\b(first campaign|campaign brief|campaign objective)\b|\b(plan|planning)\b[^.!?]*\bcampaigns?\b/.test(
      question,
    )
  )
    return 'campaign-planning';
  if (
    /\b(budget|budgets|increase|decrease|scaling|scale|wasted spend)\b/.test(
      question,
    )
  )
    return 'budget';
  if (/\b(creative|fatigue|frequency|audience overlap)\b/.test(question))
    return 'creative';
  if (
    /\b(performance|results?|metrics?|roas|revenue|conversions?|cpa|spend|summary|summarize|report|audit)\b/.test(
      question,
    )
  )
    return 'performance';
  if (/\baccounts?\b/.test(question)) return 'meta-connect';
  if (/\b(campaigns?|plan|planning)\b/.test(question))
    return 'campaign-planning';
  return 'general';
}

/** A single next action, with connection routes from the shared journey policy. */
export function assistantNextAction(
  intent: AssistantIntent,
  planning?: AssistantPlanningContext,
): AssistantNextAction {
  const dataRoutes = planning?.dataWorkspaceId
    ? journeyRoutes(planning.dataWorkspaceId)
    : planning?.routes;
  // Requests to execute are always redirected to local human review, never publication.
  if (intent === 'publishing')
    return {
      label: 'Review campaign drafts',
      detail:
        'Open Drafts & approvals to prepare or review a local draft. Nothing has been created or submitted by this conversation.',
      route: dataRoutes?.drafts,
    };
  // Explaining the visible sample must not require a live Meta connection.
  if (intent === 'performance' || intent === 'creative')
    return {
      label: 'Review campaigns',
      detail:
        'Open Campaigns in this workspace. You can choose sample preview explicitly; no live Meta reporting is available in this build.',
      route: dataRoutes?.campaigns,
    };
  // Draft planning is safe without sign-in or Meta; do not turn the demo into a setup dead end.
  if (intent === 'budget' || intent === 'campaign-planning')
    return {
      label: 'Prepare a campaign draft',
      detail:
        'You can plan before connecting. Record your objective and budget cap in a browser-local draft, then review it separately. This does not publish ads.',
      route: dataRoutes?.drafts,
    };
  if (!planning)
    return {
      label: 'Check your account setup',
      detail:
        'I do not have your connection state here. Check your Aster sign-in, then Meta authorization and your ad-account selection. You can plan before connecting.',
    };
  if (planning.phase === 'checking' || planning.phase === 'checking-meta')
    return {
      label: 'Wait for the account check',
      detail:
        'Your connection state is still being checked. You can keep asking setup or planning questions in the meantime.',
    };
  if (!planning.signedIn || !planning.metaReady)
    return {
      label: planning.action.label,
      detail: `${planning.action.detail} Basic campaign planning does not require metrics or a completed connection.`,
      route: planning.action.route,
    };
  if (
    intent === 'permissions' ||
    intent === 'account-selection' ||
    intent === 'meta-connect'
  )
    return {
      label: 'Review Meta account selection',
      detail: `${planning.selectedCount} ad account${planning.selectedCount === 1 ? ' is' : 's are'} selected. Confirm the business and account IDs in Connections; selection does not sync performance or publish ads.`,
      route: planning.routes.connection,
    };
  if (intent === 'identity')
    return {
      label: 'Review Aster account',
      detail:
        'Your Aster sign-in is separate from your Meta ad-account permissions.',
      route: planning.routes.signIn,
    };
  return {
    label: 'Open campaigns',
    detail:
      'Your Meta selection is saved. Open campaigns to plan your next step; live reporting and publishing are not enabled in this demo.',
    route: dataRoutes?.campaigns,
  };
}

/** Only a completed answer to its own preceding user message may offer an action. */
export function assistantMessageAction(
  messages: ConversationMessage[],
  planning?: AssistantPlanningContext,
): AssistantNextAction | undefined {
  const answer = messages.at(-1);
  if (
    !answer ||
    answer.role !== 'assistant' ||
    answer.status === 'pending' ||
    answer.status === 'failed'
  )
    return;
  const preceding = messages.slice(0, -1);
  const user = answer.replyToId
    ? preceding.find(
        (message) => message.role === 'user' && message.id === answer.replyToId,
      )
    : preceding.reverse().find((message) => message.role === 'user');
  if (!user || user.status === 'pending' || user.status === 'failed') return;
  return assistantNextAction(classifyAssistantIntent(user.content), planning);
}

function sampleSummary(
  data: DashboardData | undefined,
  planning?: AssistantPlanningContext,
): string {
  if (!data)
    return 'Sample metrics are unavailable, so I cannot assess performance or invent results. Setup and campaign planning are still available.';
  const metrics = data.metrics.filter(
    (item) => Number.isFinite(item.value) && item.display,
  );
  if (!metrics.length)
    return 'There are no sample metrics in this view. I cannot draw a performance conclusion from missing data. Setup and campaign planning are still available.';
  const filters = planning?.sampleFilters;
  const period = filters
    ? `${Number.parseInt(filters.range)}-day, ${filters.channel.toLowerCase()} sample (${filters.status.toLowerCase()}${filters.search ? ', with a search filter' : ''})`
    : data.series.length
      ? `loaded sample with ${data.series.length} daily data points`
      : 'loaded sample (period unavailable)';
  return `The ${period} shows ${metrics.map((item) => `${item.display} ${item.label}`).join(', ')}. These are synthetic demo figures, not your Meta results. They describe only the loaded period and filters, not necessarily the dates in your question. The aggregate does not establish campaign-level causes, profit, attribution accuracy or readiness to scale.`;
}

/** Deterministic guidance. Never display the demo API's ungrounded canned answer. */
export function groundedReply(
  prompt: string,
  data: DashboardData | undefined,
  context: string,
  planning?: AssistantPlanningContext,
): string {
  const intent = classifyAssistantIntent(prompt);
  const guidance: Record<AssistantIntent, string> = {
    identity:
      'Your Aster account is your identity in this app. Create it or sign in with Google or Facebook. Signing in with Facebook is not the same as authorizing Meta advertising access. After sign-in, open Connections, authorize Meta separately, then choose the ad accounts for your workspace. Do not share passwords or access tokens in chat.',
    'meta-connect':
      'There are three separate steps: 1. Create or sign in to your Aster account using Google or Facebook. 2. In Connections, authorize Meta advertising access with the Facebook identity that has access to the intended business. 3. Choose the correct ad accounts and save the selection. Aster sign-in alone does not connect Meta. Connecting or selecting accounts does not publish ads, spend money or sync performance, and it does not enable live AI analysis.',
    'account-selection':
      'In Connections, compare the ad-account name and ID with Meta Ads Manager, then check the owning business, currency and timezone. Similar names are not enough. Select only accounts you are authorized to use for this workspace and save the selection. If the intended account is missing, check the Facebook identity and ask the business administrator to review your access. Saving the selection does not publish ads or sync performance.',
    permissions:
      'Aster sign-in and Meta advertising authorization are separate permissions. In Connections, review the requested Meta permissions and the connected Facebook identity. That identity must have access to the intended business and ad account. If an account is missing or access is denied, ask its business administrator to check your assigned access; reconnect if authorization expired, then refresh the account list. Never paste tokens or passwords into chat. Permission grants and account selection do not publish ads or enable performance sync.',
    publishing:
      'I cannot publish, approve, pause, delete or change campaigns, and live publishing is not enabled in this build. I can help you prepare a local draft with an objective, target account, audience, creative, daily budget cap and review checklist. Review it in Drafts & approvals. A local approval is not publication; this conversation is neither an approval nor a campaign change.',
    performance: `${sampleSummary(data, planning)}\n\nSpend is advertising cost; revenue is attributed sales, not profit; ROAS is attributed revenue divided by spend; conversions count the defined outcome. Compare these with your own margin and acquisition-cost target. A weekly comparison or a live ad-account audit needs matching reporting and attribution data that this chat has not fetched.`,
    budget:
      'Review the budget safely before changing anything: define the business goal, affordable total test spend, test duration and a daily cap. Check gross margin, acceptable acquisition cost, conversion volume and attribution quality before scaling. Use a small controlled test, an explicit stop-loss and a review date rather than an automatic percentage increase. What daily or total test budget can you afford, and what outcome would make it worthwhile? I cannot change budgets or spend money. Sample metrics alone cannot justify a live budget increase.',
    creative:
      'The available sample does not include creative-level frequency, reach, CTR history or historical CPA by ad. I cannot confirm fatigue or audience overlap from it, and I have not audited live ads. Compare those signals over the same period in your real reporting; meanwhile, plan one new creative hypothesis with a clear audience and keep the budget controlled.',
    'campaign-planning':
      'You can plan your first campaign before connecting Meta or loading metrics. Start with: 1. One goal, such as sales, leads or traffic. 2. One offer, audience and location. 3. A landing page and a clear conversion event. 4. A small set of creative variations testing one hypothesis. 5. An affordable daily and total test cap, review date and stop conditions. What do you sell, who should see the ads, and what is your comfortable test budget? Before any real launch, verify the selected ad account, tracking and final creative with a human reviewer.',
    general:
      'I can help with your Aster sign-in, separate Meta authorization, choosing the right ad account, planning a first campaign, explaining the loaded sample, or reviewing a budget safely. Which step are you working on? You do not need dashboard metrics to get setup or planning help.',
  };
  const profile =
    context.trim() &&
    ['campaign-planning', 'budget', 'creative'].includes(intent)
      ? '\n\nYour saved business profile is available as planning input, not verified business data. Confirm the goal, audience and budget guardrails before using it in a draft.'
      : '';
  const next = assistantNextAction(intent, planning);
  return `${guidance[intent]}${profile}\n\nNEXT ACTION: ${next.label}. ${next.detail}\n\nThis is deterministic demo guidance, not a live AI model or a live Meta audit. No ads were changed.`;
}
