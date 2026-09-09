import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AppFrame } from '@/src/components/shell/app-frame';
import { queryKeys } from '@/src/lib/query-keys';
import { metaApi } from '@/src/lib/meta-api';
import { useWorkspaceJourney } from './use-workspace-journey';
import type { MetaConnectionStatus } from '@/src/lib/types';
import {
  callbackMessage,
  errorMessage,
  isAuthenticationRequired,
  isTokenExpiredError,
  metaReturnTo,
  useConnectionState,
} from './connection-state';

const permissionCopy: Record<string, string> = {
  ads_read: 'Read campaign delivery, spend, results, and Ads Insights reports.',
  ads_management:
    'Allow ad management access. This setup does not publish or change campaigns.',
  business_management:
    'Discover ad accounts granted through the user’s Meta Business Portfolio.',
};

const formatDate = (value: number | null) =>
  value === null || !Number.isFinite(value)
    ? 'Not provided'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));

function SignInLink({ workspaceId }: { workspaceId: string }) {
  return (
    <Link
      to="/sign-in"
      search={{ returnTo: metaReturnTo(workspaceId) }}
      className="inline-flex h-10 items-center justify-center rounded-full bg-[#161616] px-5 font-semibold text-white hover:bg-[#2e2e2e]"
    >
      Sign in to Aster
    </Link>
  );
}

function PageHeader({ workspaceId }: { workspaceId: string }) {
  return (
    <header className="border-b border-[#e8e8e8] px-6 py-5 md:px-10">
      <div className="mx-auto flex max-w-[1120px] items-start justify-between gap-6">
        <div>
          <Link
            to="/workspaces/$workspaceId/overview"
            params={{ workspaceId }}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#636363] hover:text-[#161616]"
          >
            <ArrowLeft className="size-4" />
            Back to workspace
          </Link>
          <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-.025em]">
            Meta Ads connection
          </h1>
          <p className="mt-1 max-w-2xl text-[16px] leading-6 text-[#636363]">
            Authorize your Meta account and choose the ad accounts for this
            workspace. Meta permissions are separate from your Aster sign-in.
          </p>
        </div>
        <span className="mt-2 hidden size-12 place-items-center rounded-2xl bg-[#e9f0ff] text-[#1877f2] sm:grid">
          <Link2 className="size-5" />
        </span>
      </div>
    </header>
  );
}

function isSafeRedirectUri(value: string) {
  try {
    if (!/^https?:\/\//i.test(value)) return false;
    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === 'https:' || (url.protocol === 'http:' && loopback))
    );
  } catch {
    return false;
  }
}

const accountStatusLabel = (status: number | null) =>
  ({
    1: 'Active',
    2: 'Disabled',
    3: 'Unsettled',
    7: 'Pending risk review',
    8: 'Pending settlement',
    9: 'In grace period',
    100: 'Pending closure',
    101: 'Closed',
  })[status ?? -1] ??
  (status == null ? 'Status unknown' : `Unknown status (${status})`);

function CreateAccountCard({ workspaceId }: { workspaceId: string }) {
  return (
    <section className="rounded-3xl border border-[#e0e0e0] bg-white p-6 surface-shadow md:p-8">
      <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f2f2] px-3 py-1 text-[12px] font-semibold text-[#636363]">
        Step 1 · Aster account
      </span>
      <h2 className="mt-5 text-[26px] font-semibold tracking-[-.02em]">
        Create or continue with Aster
      </h2>
      <p className="mt-2 max-w-2xl text-[16px] leading-6 text-[#636363]">
        Use Google or Facebook to create or reuse your Aster identity. Next,
        you’ll authorize Meta Ads separately and choose the ad accounts for your
        workspace.
      </p>
      <Link
        to="/sign-up"
        search={{ returnTo: metaReturnTo(workspaceId) }}
        className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[#161616] px-6 text-[16px] font-semibold text-white hover:bg-[#2e2e2e]"
      >
        Create or continue with Aster
      </Link>
      <p className="mt-3 text-[12px] text-[#7b7b7b]">
        Already have an account? The same provider sign-in reuses it. Connecting
        does not publish ads or spend money.
      </p>
    </section>
  );
}

function SetupCard({
  redirectUri,
  permissions,
}: {
  redirectUri: string;
  permissions: string[];
}) {
  const canCopyRedirect = isSafeRedirectUri(redirectUri);
  const copyRedirect = async () => {
    if (!canCopyRedirect) return;
    try {
      await navigator.clipboard.writeText(redirectUri);
      toast.success('Redirect URI copied');
    } catch {
      toast.error('Could not copy', {
        description: 'Select and copy the redirect URI manually.',
      });
    }
  };
  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-3xl border border-[#e0e0e0] bg-white p-6 surface-shadow md:p-8">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#fff3cd] text-[#8a5b00]">
          <KeyRound className="size-5" />
        </div>
        <h2 className="mt-5 text-[24px] font-semibold tracking-[-.02em]">
          Meta authorization is unavailable
        </h2>
        <p className="mt-2 max-w-2xl leading-6 text-[#636363]">
          Step 2 · Authorize Meta Ads. This step is unavailable in this
          environment. Ask your administrator to enable it, then check again.
          You do not need to enter any credentials here.
        </p>
        <button
          type="button"
          disabled
          className="mt-6 inline-flex h-11 items-center rounded-full bg-[#161616] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Authorize Meta Ads · Unavailable
        </button>
        <details className="mt-6 rounded-2xl bg-[#f8f8f8] p-4 text-[13px]">
          <summary className="cursor-pointer font-semibold">
            Administrator setup checklist
          </summary>
          <p className="mt-3 leading-5 text-[#636363]">
            Review these requirements; this page cannot identify which
            configuration item is missing. Never enter or share secrets here.
          </p>
          <ol className="mt-6 grid gap-4">
            {[
              'Create a Business app in Meta for Developers and add Facebook Login for Business.',
              'Add the exact redirect URI below to Valid OAuth Redirect URIs.',
              'Configure the permissions shown here and obtain the required Meta approval for your users.',
              'Set META_APP_ID, META_APP_SECRET, and META_TOKEN_ENCRYPTION_KEY server-side, deploy the OAuth Worker, and apply database migrations.',
            ].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#161616] text-[12px] font-semibold text-white">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-5">{item}</span>
              </li>
            ))}
          </ol>
          {canCopyRedirect ? (
            <div className="mt-6 rounded-2xl bg-[#f5f7fb] p-4">
              <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-[#636363]">
                Valid OAuth redirect URI
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[13px] text-[#303030]">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={() => void copyRedirect()}
                  aria-label="Copy redirect URI"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#636363] shadow-sm hover:text-[#161616]"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[#636363]">
              No valid redirect URL is available. Check the server’s public
              OAuth callback URL before configuring Meta.
            </p>
          )}
          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#161616] px-5 font-semibold text-white hover:bg-[#2e2e2e]"
          >
            Open Meta for Developers
            <ExternalLink className="size-4" />
          </a>
        </details>
      </div>
      <div className="rounded-3xl bg-[#161616] p-6 text-white md:p-8">
        <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-white/45">
          Permissions requested
        </div>
        <div className="mt-5 grid gap-3">
          {permissions.map((permission) => (
            <div
              key={permission}
              className="rounded-2xl border border-white/10 p-4"
            >
              <div className="flex items-center gap-2 font-semibold">
                <Check className="size-4 text-[#91e5b2]" />
                <code>{permission}</code>
              </div>
              <p className="mt-2 text-[13px] leading-[18px] text-white/60">
                {permissionCopy[permission] ??
                  'Required by the Meta connection.'}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3 border-t border-white/10 pt-5 text-[13px] leading-[18px] text-white/60">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#91e5b2]" />
          Access tokens stay on the server, are encrypted with AES-GCM, and are
          isolated by authenticated user and workspace.
        </div>
      </div>
    </section>
  );
}

function DisconnectedCard({
  workspaceId,
  permissions,
}: {
  workspaceId: string;
  permissions: string[];
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-3xl border border-[#e0e0e0] bg-white p-6 surface-shadow md:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f2f2] px-3 py-1 text-[12px] font-semibold text-[#636363]">
              <span className="size-2 rounded-full bg-[#9e9e9e]" />
              Step 2 · Authorize Meta Ads
            </span>
            <h2 className="mt-5 text-[26px] font-semibold tracking-[-.02em]">
              Authorize Meta, then choose accounts
            </h2>
            <p className="mt-2 max-w-2xl text-[16px] leading-6 text-[#636363]">
              You’ll sign in on Meta, approve the requested access, then return
              here to choose the ad accounts to save for this workspace. This
              does not launch ads or start live campaign synchronization.
            </p>
          </div>
          <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-[#e9f0ff] text-[#1877f2] sm:grid">
            <Building2 className="size-5" />
          </span>
        </div>
        <a
          href={metaApi.connectUrl(workspaceId)}
          className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[#161616] px-6 text-[16px] font-semibold text-white hover:bg-[#2e2e2e]"
        >
          Authorize Meta Ads
          <ExternalLink className="size-4" />
        </a>
        <p className="mt-3 text-[12px] text-[#7b7b7b]">
          Authorization happens on facebook.com. Your Meta password is never
          shared with Aster.
        </p>
      </div>
      <div className="rounded-3xl border border-[#e0e0e0] bg-[#f8f8f8] p-6 md:p-8">
        <div className="text-[12px] font-semibold uppercase tracking-[.08em] text-[#636363]">
          What you’re approving
        </div>
        <div className="mt-5 grid gap-4">
          {permissions.map((permission) => (
            <div key={permission} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#287a4b]" />
              <div>
                <code className="font-semibold">{permission}</code>
                <p className="mt-1 text-[13px] leading-[18px] text-[#636363]">
                  {permissionCopy[permission] ??
                    'Review this permission on the Facebook authorization screen.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConnectedView({
  workspaceId,
  data,
  checking,
}: {
  workspaceId: string;
  data: MetaConnectionStatus;
  checking: boolean;
}) {
  const queryClient = useQueryClient();
  const state = useConnectionState(data);
  const initialSelection = useMemo(
    () =>
      data.accounts
        .filter((account) => account.selected)
        .map((account) => account.metaAccountId),
    [data.accounts],
  );
  const [selected, setSelected] = useState(initialSelection);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [mutationError, setMutationError] = useState<unknown>(null);
  const dirty =
    selected.length !== initialSelection.length ||
    selected.some((id) => !initialSelection.includes(id));
  const refetch = () =>
    queryClient.invalidateQueries(
      { queryKey: queryKeys.metaConnection(workspaceId) },
      { throwOnError: true },
    );
  const onError = (error: unknown) => {
    setMutationError(error);
    if (isTokenExpiredError(error))
      queryClient.setQueryData<MetaConnectionStatus>(
        queryKeys.metaConnection(workspaceId),
        (current) =>
          current?.connection
            ? {
                ...current,
                connection: { ...current.connection, status: 'expired' },
              }
            : current,
      );
  };
  const save = useMutation({
    mutationFn: (accountIds: string[]) =>
      metaApi.selectAccounts(workspaceId, accountIds),
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await refetch();
      toast.success('Ad account selection saved');
    },
    onError,
  });
  const refresh = useMutation({
    mutationFn: () => metaApi.refresh(workspaceId),
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await refetch();
      toast.success('Ad account list refreshed', {
        description: 'This updates the account list only, not campaign data.',
      });
    },
    onError,
  });
  const disconnect = useMutation({
    mutationFn: () => metaApi.disconnect(workspaceId),
    onMutate: () => setMutationError(null),
    onSuccess: async (result) => {
      await refetch();
      setDisconnectOpen(false);
      toast.success('Meta connection removed', {
        description: result?.revokedAtMeta
          ? 'Meta app permission was also revoked. Other Aster workspaces may need to reconnect.'
          : result
            ? 'Aster removed the connection. Meta permission revocation was not confirmed; review Aster in your Facebook app settings.'
            : 'No stored connection remains in this workspace.',
      });
    },
    onError,
  });
  const pending = save.isPending || refresh.isPending || disconnect.isPending;
  const authRequired = isAuthenticationRequired(mutationError);
  const active = state.active && !isTokenExpiredError(mutationError);
  const blocked = pending || checking || authRequired;
  const connection = data.connection;
  if (!connection) return null;
  const selectedSet = new Set(selected);
  const accessUnavailable = !active;

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-[#e0e0e0] bg-white p-6 surface-shadow md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold ${accessUnavailable ? 'bg-[#fff0ef] text-[#a52b27]' : 'bg-[#def4e7] text-[#287a4b]'}`}
            >
              <span
                className={`size-2 rounded-full ${accessUnavailable ? 'bg-[#cd2823]' : 'bg-[#45b97c]'}`}
              />
              {!data.configured
                ? 'Authorization unavailable'
                : accessUnavailable
                  ? 'Reconnect required'
                  : initialSelection.length
                    ? 'Ad-account selection saved'
                    : 'Choose ad accounts'}
            </span>
            <h2 className="mt-4 text-[26px] font-semibold tracking-[-.02em]">
              {connection.metaUserName || 'Meta user'}
            </h2>
            <p className="mt-1 text-[#636363]">
              Meta user ID {connection.metaUserId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => refresh.mutate()}
              disabled={blocked || accessUnavailable || dirty}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d6d6d6] px-4 font-semibold hover:bg-[#f2f2f2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${refresh.isPending ? 'animate-spin' : ''}`}
              />
              {refresh.isPending ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              disabled={blocked || dirty || !data.configured}
              onClick={() =>
                window.location.assign(metaApi.connectUrl(workspaceId))
              }
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#161616] px-4 font-semibold text-white hover:bg-[#2e2e2e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Authorize Meta Ads
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 border-t border-[#ededed] pt-5 sm:grid-cols-3">
          <div>
            <div className="text-[12px] font-semibold text-[#7b7b7b]">
              AD ACCOUNTS
            </div>
            <div className="mt-1 text-[20px] font-semibold">
              {data.accounts.length}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#7b7b7b]">
              ACCOUNT LIST UPDATED
            </div>
            <div className="mt-1 text-[14px] font-semibold">
              {formatDate(connection.lastSyncedAt)}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#7b7b7b]">
              TOKEN EXPIRES
            </div>
            <div className="mt-1 text-[14px] font-semibold">
              {formatDate(connection.tokenExpiresAt)}
            </div>
          </div>
        </div>
      </section>

      {mutationError ? (
        <div
          role="alert"
          className="rounded-2xl border border-[#f0d3d1] bg-[#fff7f6] p-4 text-[13px] leading-5 text-[#a52b27]"
        >
          <p>{errorMessage(mutationError)}</p>
          {!authRequired ? (
            <p className="mt-2">
              {isTokenExpiredError(mutationError)
                ? 'Authorize Meta Ads again to renew access. Discard unsaved changes first if needed.'
                : 'Your selection has not been confirmed. Retry the failed action; if access changed, discard unsaved changes, refresh the account list, or authorize Meta Ads again.'}
            </p>
          ) : null}
          {authRequired ? (
            <div className="mt-3">
              <SignInLink workspaceId={workspaceId} />
            </div>
          ) : null}
        </div>
      ) : null}
      <section
        aria-busy={pending || checking}
        className="overflow-hidden rounded-3xl border border-[#e0e0e0] bg-white surface-shadow"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ededed] px-6 py-5 md:px-8">
          <div>
            <h2 className="text-[21px] font-semibold">Ad account access</h2>
            <p className="mt-1 text-[13px] text-[#636363]">
              Choose ad accounts and save the selection for this workspace. This
              does not enable live reporting or publishing.
            </p>
          </div>
          {!dirty && selected.length > 0 && active && !blocked ? (
            <Link
              to="/workspaces/$workspaceId/performance"
              params={{ workspaceId }}
              className="inline-flex h-10 min-w-[130px] items-center justify-center gap-2 rounded-full bg-[#161616] px-4 font-semibold text-white hover:bg-[#2e2e2e]"
            >
              Open campaigns
            </Link>
          ) : (
            <button
              type="button"
              disabled={
                blocked || accessUnavailable || !dirty || selected.length === 0
              }
              onClick={() => save.mutate([...selected])}
              className="inline-flex h-10 min-w-[130px] items-center justify-center gap-2 rounded-full bg-[#161616] px-4 font-semibold text-white hover:bg-[#2e2e2e] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {save.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {save.isPending
                ? 'Saving…'
                : selected.length === 0
                  ? 'Select an account'
                  : dirty
                    ? 'Save ad accounts'
                    : active
                      ? 'Open campaigns'
                      : 'Authorization required'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ededed] px-6 py-3 text-[12px] text-[#636363] md:px-8">
          <output aria-live="polite">
            {selected.length} selected ·{' '}
            {dirty
              ? selected.length
                ? 'Unsaved changes. Save or discard before refreshing or reauthorizing.'
                : 'Select at least one account, or discard your changes.'
              : accessUnavailable
                ? 'Authorization is unavailable. Reauthorize when enabled to edit access.'
                : initialSelection.length
                  ? 'Ad-account selection saved. Refresh updates the account list only.'
                  : 'Choose at least one account to continue.'}
          </output>
          {dirty ? (
            <button
              type="button"
              disabled={blocked}
              onClick={() => setSelected(initialSelection)}
              className="font-semibold text-[#161616] underline underline-offset-4 disabled:opacity-50"
            >
              Discard changes
            </button>
          ) : null}
        </div>
        <p className="border-b border-[#ededed] px-6 py-3 text-[12px] leading-5 text-[#636363] md:px-8">
          Account status is reported by Meta. Inactive or unknown accounts may
          still provide readable history; selecting an account does not
          establish eligibility to publish.
        </p>
        {data.accounts.length ? (
          <div className="divide-y divide-[#ededed]">
            {data.accounts.map((account) => {
              const checked = selectedSet.has(account.metaAccountId);
              return (
                <label
                  key={account.metaAccountId}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-[#fafafa] md:px-8"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={blocked || accessUnavailable}
                    aria-label={`Select ${account.name}, ${account.metaAccountId}`}
                    onChange={() =>
                      setSelected((current) =>
                        checked
                          ? current.filter((id) => id !== account.metaAccountId)
                          : [...current, account.metaAccountId],
                      )
                    }
                    className="size-4 accent-[#161616] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9f0ff] text-[#1877f2]">
                    <Building2 className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {account.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#7b7b7b]">
                      {account.businessName || 'Personal ad account'} ·{' '}
                      {account.metaAccountId}
                      <span className="sm:hidden">
                        {' '}
                        · {accountStatusLabel(account.accountStatus)}
                      </span>
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block text-[13px] font-semibold">
                      {account.currency || 'Not provided'}
                    </span>
                    <span className="block text-[12px] text-[#7b7b7b]">
                      {accountStatusLabel(account.accountStatus)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center md:px-8">
            <Building2 className="mx-auto size-8 text-[#b0b0b0]" />
            <h3 className="mt-3 font-semibold">
              No accessible ad accounts found
            </h3>
            <p className="mx-auto mt-1 max-w-md text-[13px] leading-5 text-[#636363]">
              Confirm that this Meta user has access to an ad account, then use
              Refresh above. If none appear, use Authorize Meta Ads to review
              your permissions with the correct Meta user.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#f0d3d1] bg-[#fffafa] p-6 md:px-8">
        <div>
          <h2 className="font-semibold">Disconnect Meta Ads</h2>
          <p className="mt-1 text-[13px] text-[#7b5552]">
            Remove this workspace’s connection and attempt to revoke Meta app
            access. Revocation can affect other workspaces using the same
            Facebook user.
          </p>
        </div>
        <AlertDialog
          open={disconnectOpen}
          onOpenChange={(open) => {
            if (!disconnect.isPending) setDisconnectOpen(open);
          }}
        >
          <AlertDialogTrigger
            render={
              <button
                aria-label="Disconnect Meta Ads"
                type="button"
                disabled={blocked}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#dca8a5] px-4 font-semibold text-[#a52b27] hover:bg-[#fff0ef]"
              />
            }
          >
            <Trash2 className="size-4" />
            Disconnect
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-[#fff0ef] text-[#cd2823]">
                <Trash2 />
              </AlertDialogMedia>
              <AlertDialogTitle>Disconnect Meta Ads?</AlertDialogTitle>
              <AlertDialogDescription>
                Aster will remove this authorization and imported ad account
                records for this workspace. It also attempts to revoke Aster’s
                app permission at Meta, which can affect other workspaces
                connected with the same Facebook user. Those workspaces may need
                to reconnect.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {disconnect.isError ? (
              <p role="alert" className="text-[13px] text-[#a52b27]">
                {errorMessage(disconnect.error)}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={disconnect.isPending}>
                Keep connected
              </AlertDialogCancel>
              <button
                type="button"
                disabled={pending || authRequired || checking}
                onClick={() => disconnect.mutate()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#cd2823] px-4 font-semibold text-white hover:bg-[#b7221e] disabled:opacity-50"
              >
                {disconnect.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Disconnect
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}

export function MetaConnectionPage() {
  const { workspaceId: requestedWorkspaceId } = useParams({
    from: '/workspaces/$workspaceId/connections/meta',
  });
  const search = useSearch({
    from: '/workspaces/$workspaceId/connections/meta',
  });
  const navigate = useNavigate();
  const journey = useWorkspaceJourney(requestedWorkspaceId);
  const {
    sessionQuery,
    metaQuery: query,
    connectionWorkspaceId: workspaceId,
  } = journey;
  const [callback, setCallback] = useState(() =>
    callbackMessage(search.meta, search.reason),
  );
  useEffect(() => {
    if (sessionQuery.isPending || sessionQuery.isError) return;
    if (!search.meta && !search.reason && workspaceId === requestedWorkspaceId)
      return;
    const message = callbackMessage(search.meta, search.reason);
    void navigate({
      to: '/workspaces/$workspaceId/connections/meta',
      params: { workspaceId },
      search: {},
      replace: true,
    }).then(() => {
      if (message) setCallback(message);
    });
  }, [
    navigate,
    search.meta,
    search.reason,
    workspaceId,
    requestedWorkspaceId,
    sessionQuery.isPending,
    sessionQuery.isError,
  ]);
  return (
    <AppFrame workspaceId={workspaceId} section="hub">
      <div className="h-full overflow-y-auto bg-[#fbfbfb]">
        <PageHeader workspaceId={workspaceId} />
        <main className="mx-auto max-w-[1120px] px-6 py-7 md:px-10 md:py-10">
          {callback ? (
            <output className="mb-5 flex gap-3 rounded-2xl border border-[#eadfb9] bg-[#fffbee] p-4">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-[#8a6500]" />
              <div className="flex-1 text-[13px] leading-5 text-[#636363]">
                {callback}
              </div>
              <button
                type="button"
                aria-label="Dismiss connection update"
                onClick={() => setCallback(null)}
                className="text-[12px] font-semibold text-[#636363] underline"
              >
                Dismiss
              </button>
            </output>
          ) : null}
          {journey.loading ? (
            <div className="grid min-h-[360px] place-items-center rounded-3xl border border-[#e0e0e0] bg-white">
              <div className="text-center text-[#636363]">
                <LoaderCircle className="mx-auto size-6 animate-spin" />
                <p className="mt-3">
                  {sessionQuery.isPending
                    ? 'Checking your Aster account…'
                    : 'Checking Meta authorization…'}
                </p>
              </div>
            </div>
          ) : sessionQuery.isError ? (
            <div
              className="rounded-3xl border border-[#f0d3d1] bg-white p-8 text-center"
              role="alert"
            >
              <TriangleAlert className="mx-auto size-8 text-[#cd2823]" />
              <h2 className="mt-4 text-[21px] font-semibold">
                Could not check your Aster account
              </h2>
              <p className="mt-2 text-[#636363]">
                Check your session before continuing to Meta. Your saved
                connection has not been changed.
              </p>
              <button
                type="button"
                disabled={sessionQuery.isFetching}
                onClick={() => void sessionQuery.refetch()}
                className="mt-5 h-10 rounded-full bg-[#161616] px-5 font-semibold text-white disabled:opacity-50"
              >
                {sessionQuery.isFetching ? 'Checking…' : 'Try again'}
              </button>
            </div>
          ) : !journey.signedIn ? (
            <CreateAccountCard workspaceId={workspaceId} />
          ) : query.isError || !query.data ? (
            <div
              className="rounded-3xl border border-[#f0d3d1] bg-white p-8 text-center"
              role="alert"
            >
              <TriangleAlert className="mx-auto size-8 text-[#cd2823]" />
              <h2 className="mt-4 text-[21px] font-semibold">
                {isTokenExpiredError(query.error)
                  ? 'Meta authorization expired'
                  : 'Could not load the connection'}
              </h2>
              <p className="mt-2 text-[#636363]">{errorMessage(query.error)}</p>
              <p className="mt-2 text-[13px] text-[#636363]">
                {isTokenExpiredError(query.error)
                  ? 'Authorize Meta Ads again, then confirm your ad accounts.'
                  : 'Try checking again. If access is still unavailable, ask your workspace administrator to review your access.'}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                  className="h-10 rounded-full bg-[#161616] px-5 font-semibold text-white disabled:opacity-50"
                >
                  {query.isFetching ? 'Checking…' : 'Try again'}
                </button>
                {isTokenExpiredError(query.error) ? (
                  <a
                    href={metaApi.connectUrl(workspaceId)}
                    className="inline-flex h-10 items-center rounded-full bg-[#161616] px-5 font-semibold text-white"
                  >
                    Authorize Meta Ads
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              {!query.data.configured ? (
                <SetupCard
                  redirectUri={query.data.redirectUri}
                  permissions={query.data.requiredPermissions}
                />
              ) : null}
              {query.data.connection ? (
                <ConnectedView
                  key={`${workspaceId}:${query.data.connection.id}:${query.data.connection.updatedAt}:${query.data.accounts
                    .filter((account) => account.selected)
                    .map((account) => account.metaAccountId)
                    .sort()
                    .join(',')}`}
                  workspaceId={workspaceId}
                  data={query.data}
                  checking={query.isFetching}
                />
              ) : query.data.configured ? (
                <DisconnectedCard
                  workspaceId={workspaceId}
                  permissions={query.data.requiredPermissions}
                />
              ) : null}
            </div>
          )}
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f1f3f6] p-4 text-[13px] leading-5 text-[#636363]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#287a4b]" />
            Saving ad-account selection does not enable live reporting, publish
            ads, or spend money. Live reporting and publishing are not
            implemented in this build. Campaigns offers an optional sample
            preview.
          </div>
        </main>
      </div>
    </AppFrame>
  );
}
