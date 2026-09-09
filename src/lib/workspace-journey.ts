import type { AuthSession } from './auth-api';
import type { MetaConnectionStatus } from './types';
import { isDemoWorkspace } from './workspaces';

export type JourneyPhase =
  | 'checking'
  | 'account-error'
  | 'sign-in'
  | 'checking-meta'
  | 'meta-error'
  | 'meta-unavailable'
  | 'connect-meta'
  | 'reconnect-meta'
  | 'no-accounts'
  | 'choose-accounts'
  | 'campaigns';
export interface JourneyInput {
  workspaceId: string;
  session?: AuthSession;
  sessionPending?: boolean;
  sessionFailed?: boolean;
  meta?: MetaConnectionStatus;
  metaPending?: boolean;
  metaFailed?: boolean;
  metaAuthRequired?: boolean;
  metaErrorCode?: string;
  now?: number;
}

export function journeyRoutes(workspaceId: string) {
  const params = { workspaceId };
  const returnTo = `/workspaces/${encodeURIComponent(workspaceId)}/connections/meta`;
  return {
    signUp: { to: '/sign-up' as const, search: { returnTo } },
    signIn: { to: '/sign-in' as const, search: { returnTo } },
    connection: {
      to: '/workspaces/$workspaceId/connections/meta' as const,
      params,
    },
    campaigns: { to: '/workspaces/$workspaceId/performance' as const, params },
    drafts: {
      to: '/workspaces/$workspaceId/performance/launch' as const,
      params,
    },
    assistant: { to: '/workspaces/$workspaceId/overview' as const, params },
  };
}

/** One next-step policy shared by Home, Connections and campaign empty states. */
export function deriveWorkspaceJourney(input: JourneyInput) {
  const demo = isDemoWorkspace(input.workspaceId);
  const connectionWorkspaceId =
    demo && input.session?.user
      ? input.session.user.defaultWorkspaceId
      : input.workspaceId;
  const routes = journeyRoutes(connectionWorkspaceId);
  const signedIn =
    Boolean(input.session?.user) &&
    !input.metaAuthRequired &&
    !input.sessionFailed;
  const connection = input.meta?.connection;
  const expired =
    Boolean(
      connection &&
      (connection.status === 'expired' ||
        (connection.tokenExpiresAt !== null &&
          connection.tokenExpiresAt <= (input.now ?? Date.now()))),
    ) || input.metaErrorCode === 'meta_token_expired';
  const active = Boolean(
    signedIn &&
    input.meta?.configured &&
    connection?.status === 'active' &&
    !expired &&
    !input.metaFailed,
  );
  const selectedCount = active
    ? (input.meta?.accounts.filter((account) => account.selected).length ?? 0)
    : 0;
  const metaReady = active && selectedCount > 0;
  let phase: JourneyPhase;
  if (input.sessionPending) phase = 'checking';
  else if (input.sessionFailed) phase = 'account-error';
  else if (!signedIn) phase = 'sign-in';
  else if (input.metaPending) phase = 'checking-meta';
  else if (expired) phase = 'reconnect-meta';
  else if (input.metaFailed || !input.meta) phase = 'meta-error';
  else if (!input.meta.configured) phase = 'meta-unavailable';
  else if (!active) phase = 'connect-meta';
  else if (!input.meta.accounts.length) phase = 'no-accounts';
  else if (!selectedCount) phase = 'choose-accounts';
  else phase = 'campaigns';

  const copy: Record<
    JourneyPhase,
    { title: string; short: string; detail: string; label: string }
  > = {
    checking: {
      title: 'Getting started',
      short: 'Checking your account…',
      detail: 'Checking your Aster account before choosing the next step.',
      label: 'Checking your account',
    },
    'account-error': {
      title: 'Check your account',
      short: 'Try signing in',
      detail:
        'Your account could not be checked. Try signing in again; your saved drafts have not been changed.',
      label: 'Check account access',
    },
    'sign-in': {
      title: 'Create account',
      short: 'Google or Facebook',
      detail:
        'Create an Aster account with Google or Facebook. You will authorize Meta advertising access separately.',
      label: 'Create Aster account',
    },
    'checking-meta': {
      title: 'Checking Meta',
      short: 'Checking access…',
      detail:
        'Checking Meta authorization and your saved ad-account selection.',
      label: 'Checking Meta connection',
    },
    'meta-error': {
      title: 'Review connection',
      short: 'Connection check failed',
      detail:
        'The Meta connection could not be checked. Review the connection status before relying on any account data.',
      label: 'Review Meta connection',
    },
    'meta-unavailable': {
      title: 'Set up Meta',
      short: 'Admin setup needed',
      detail:
        'Meta connection is not enabled in this environment yet. You can prepare drafts or explore the demo while the administrator completes setup.',
      label: 'Check Meta setup',
    },
    'connect-meta': {
      title: 'Connect Meta',
      short: 'Authorize ad access',
      detail:
        'Authorize Meta, then choose the ad accounts for this workspace. Connecting does not publish ads or spend money.',
      label: 'Connect Meta account',
    },
    'reconnect-meta': {
      title: 'Reconnect Meta',
      short: 'Authorization expired',
      detail:
        'Meta authorization expired. Reconnect and confirm the ad accounts you want to keep using.',
      label: 'Reconnect Meta',
    },
    'no-accounts': {
      title: 'Review Meta access',
      short: 'No ad accounts found',
      detail:
        'Meta is authorized, but no accessible ad accounts were returned. Check your business access and refresh the account list.',
      label: 'Review account access',
    },
    'choose-accounts': {
      title: 'Choose ad accounts',
      short: 'Save your selection',
      detail:
        'Choose your Meta ad accounts and save the selection. Authorization alone does not finish this step.',
      label: 'Choose ad accounts',
    },
    campaigns: {
      title: 'Meta is connected',
      short: 'Open campaigns',
      detail:
        'Your ad-account selection is saved. You can prepare and review drafts; live reporting and publishing are not enabled in this build.',
      label: 'Open campaigns',
    },
  };
  const returningSignIn = phase === 'sign-in' && input.metaAuthRequired;
  const actionRoute =
    phase === 'sign-in'
      ? returningSignIn
        ? routes.signIn
        : routes.signUp
      : phase === 'account-error'
        ? routes.signIn
        : phase === 'campaigns'
          ? routes.campaigns
          : routes.connection;
  const currentStep =
    !signedIn || phase === 'account-error' || phase === 'checking'
      ? 0
      : metaReady
        ? 2
        : 1;
  const steps = [
    { id: 'account', label: 'Aster account', complete: signedIn },
    { id: 'meta', label: 'Meta account', complete: metaReady },
    { id: 'campaigns', label: 'Campaigns', complete: false },
  ].map((step, index) => ({
    ...step,
    number: index + 1,
    current: index === currentStep,
  }));
  return {
    phase,
    demo,
    signedIn,
    active,
    expired,
    metaReady,
    selectedCount,
    connectionWorkspaceId,
    routes,
    steps,
    loading: phase === 'checking' || phase === 'checking-meta',
    action: {
      ...copy[phase],
      ...(returningSignIn
        ? {
            title: 'Sign in again',
            short: 'Check Aster access',
            detail:
              'Your Aster session needs to be checked again before managing Meta access.',
            label: 'Sign in to Aster',
          }
        : {}),
      route: actionRoute,
    },
    // Connection readiness must never be represented as reporting/publishing readiness.
    capabilities: {
      liveReporting: false,
      livePublishing: false,
      liveAi: false,
    } as const,
  };
}
export type WorkspaceJourney = ReturnType<typeof deriveWorkspaceJourney>;
