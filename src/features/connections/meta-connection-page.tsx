import { useMemo, useState } from 'react';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const permissionCopy: Record<string, string> = {
  ads_read: 'Read campaign delivery, spend, results, and Ads Insights reports.',
  ads_management: 'Create, edit, launch, pause, and manage ads and campaigns.',
  business_management:
    'Discover ad accounts granted through the user’s Meta Business Portfolio.',
};

const callbackMessages: Record<string, { title: string; detail: string }> = {
  connected: {
    title: 'Meta Ads connected',
    detail: 'Your accessible ad accounts have been securely imported.',
  },
  cancelled: {
    title: 'Connection cancelled',
    detail:
      'Nothing was changed. You can restart the Meta authorization anytime.',
  },
  error: {
    title: 'Meta could not be connected',
    detail: 'Review the app setup and permissions, then try again.',
  },
};

const formatDate = (value: number | null) => {
  if (!value) return 'Not provided';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const getMutationMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Please try again.';

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
            Let each signed-in user authorize their own Meta account and choose
            which ad accounts Aster can operate in this workspace.
          </p>
        </div>
        <span className="mt-2 hidden size-12 place-items-center rounded-2xl bg-[#e9f0ff] text-[#1877f2] sm:grid">
          <Link2 className="size-5" />
        </span>
      </div>
    </header>
  );
}

function SetupCard({
  redirectUri,
  permissions,
}: {
  redirectUri: string;
  permissions: string[];
}) {
  const copyRedirect = async () => {
    await navigator.clipboard.writeText(redirectUri);
    toast.success('Redirect URI copied');
  };
  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-3xl border border-[#e0e0e0] bg-white p-6 surface-shadow md:p-8">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#fff3cd] text-[#8a5b00]">
          <KeyRound className="size-5" />
        </div>
        <h2 className="mt-5 text-[24px] font-semibold tracking-[-.02em]">
          Configure your Meta app first
        </h2>
        <p className="mt-2 max-w-2xl leading-6 text-[#636363]">
          The OAuth backend is ready, but this deployment still needs its Meta
          App ID, App Secret, and a 32-byte token-encryption key as protected
          runtime values.
        </p>
        <ol className="mt-6 grid gap-4">
          {[
            'Create a Business app in Meta for Developers and add Facebook Login for Business.',
            'Add the exact redirect URI below to Valid OAuth Redirect URIs.',
            'Configure the three permissions and request Advanced Access during App Review.',
            'Set META_APP_ID, META_APP_SECRET, and META_TOKEN_ENCRYPTION_KEY in the deployment.',
          ].map((item, index) => (
            <li key={item} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#161616] text-[12px] font-semibold text-white">
                {index + 1}
              </span>
              <span className="pt-0.5 leading-5">{item}</span>
            </li>
          ))}
        </ol>
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
        <a
          href="https://developers.facebook.com/apps/"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#1877f2] px-5 font-semibold text-white hover:bg-[#1268d8]"
        >
          Open Meta for Developers
          <ExternalLink className="size-4" />
        </a>
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
              Not connected
            </span>
            <h2 className="mt-5 text-[26px] font-semibold tracking-[-.02em]">
              Connect your Meta ad accounts
            </h2>
            <p className="mt-2 max-w-2xl text-[16px] leading-6 text-[#636363]">
              You’ll sign in on Meta, approve the requested access, then return
              here to choose the ad accounts Aster should monitor and manage.
            </p>
          </div>
          <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-[#e9f0ff] text-[#1877f2] sm:grid">
            <Building2 className="size-5" />
          </span>
        </div>
        <a
          href={metaApi.connectUrl(workspaceId)}
          className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[#1877f2] px-6 text-[16px] font-semibold text-white hover:bg-[#1268d8]"
        >
          Continue with Meta
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
                  {permissionCopy[permission]}
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
}: {
  workspaceId: string;
  data: Awaited<ReturnType<typeof metaApi.status>>;
}) {
  const queryClient = useQueryClient();
  const initialSelection = useMemo(
    () =>
      data.accounts
        .filter((account) => account.selected)
        .map((account) => account.metaAccountId),
    [data.accounts],
  );
  const [selected, setSelected] = useState<string[]>(initialSelection);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.metaConnection(workspaceId),
    });

  const save = useMutation({
    mutationFn: () => metaApi.selectAccounts(workspaceId, selected),
    onSuccess: async () => {
      await invalidate();
      toast.success('Ad account access saved');
    },
    onError: (error) =>
      toast.error('Could not save', { description: getMutationMessage(error) }),
  });
  const refresh = useMutation({
    mutationFn: () => metaApi.refresh(workspaceId),
    onSuccess: async (result) => {
      await invalidate();
      toast.success('Meta accounts refreshed', {
        description: `${result.accountCount} ad account${result.accountCount === 1 ? '' : 's'} found.`,
      });
    },
    onError: (error) =>
      toast.error('Refresh failed', { description: getMutationMessage(error) }),
  });
  const disconnect = useMutation({
    mutationFn: () => metaApi.disconnect(workspaceId),
    onSuccess: async () => {
      await invalidate();
      toast.success('Meta Ads disconnected', {
        description:
          'Stored authorization and imported account records were removed.',
      });
    },
    onError: (error) =>
      toast.error('Disconnect failed', {
        description: getMutationMessage(error),
      }),
  });

  const connection = data.connection;
  if (!connection) return null;
  const selectedSet = new Set(selected);
  const dirty =
    selected.length !== initialSelection.length ||
    selected.some((accountId) => !initialSelection.includes(accountId));
  const expired = connection.status === 'expired';

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-[#e0e0e0] bg-white p-6 surface-shadow md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold ${expired ? 'bg-[#fff0ef] text-[#a52b27]' : 'bg-[#def4e7] text-[#287a4b]'}`}
            >
              <span
                className={`size-2 rounded-full ${expired ? 'bg-[#cd2823]' : 'bg-[#45b97c]'}`}
              />
              {expired ? 'Reconnect required' : 'Connected'}
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
              disabled={refresh.isPending || expired}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d6d6d6] px-4 font-semibold hover:bg-[#f2f2f2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${refresh.isPending ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <a
              href={metaApi.connectUrl(workspaceId)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#161616] px-4 font-semibold text-white hover:bg-[#2e2e2e]"
            >
              {expired ? 'Reconnect' : 'Reauthorize'}
            </a>
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
              LAST SYNC
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

      <section className="overflow-hidden rounded-3xl border border-[#e0e0e0] bg-white surface-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ededed] px-6 py-5 md:px-8">
          <div>
            <h2 className="text-[21px] font-semibold">Ad account access</h2>
            <p className="mt-1 text-[13px] text-[#636363]">
              Only selected accounts will be available to dashboards and the AI
              agent.
            </p>
          </div>
          <button
            type="button"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex h-10 min-w-[130px] items-center justify-center gap-2 rounded-full bg-[#161616] px-4 font-semibold text-white hover:bg-[#2e2e2e] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {save.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Save access
          </button>
        </div>
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
                    onChange={() =>
                      setSelected((current) =>
                        checked
                          ? current.filter((id) => id !== account.metaAccountId)
                          : [...current, account.metaAccountId],
                      )
                    }
                    className="size-4 accent-[#161616]"
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
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block text-[13px] font-semibold">
                      {account.currency || '—'}
                    </span>
                    <span className="block text-[12px] text-[#7b7b7b]">
                      {account.accountStatus === 1
                        ? 'Active'
                        : `Status ${account.accountStatus ?? 'unknown'}`}
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
              Confirm that this Meta user has access to an ad account, then
              refresh or reauthorize.
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#f0d3d1] bg-[#fffafa] p-6 md:px-8">
        <div>
          <h2 className="font-semibold">Disconnect Meta Ads</h2>
          <p className="mt-1 text-[13px] text-[#7b5552]">
            Revoke Meta permissions and delete the encrypted token and imported
            account records.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <button
                aria-label="Disconnect Meta Ads"
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
                Aster will remove this authorization and all imported ad account
                records for this workspace. You can reconnect later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={disconnect.isPending}>
                Keep connected
              </AlertDialogCancel>
              <button
                type="button"
                disabled={disconnect.isPending}
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
  const { workspaceId } = useParams({
    from: '/workspaces/$workspaceId/connections/meta',
  });
  const search = useSearch({
    from: '/workspaces/$workspaceId/connections/meta',
  });
  const query = useQuery({
    queryKey: queryKeys.metaConnection(workspaceId),
    queryFn: ({ signal }) => metaApi.status(workspaceId, signal),
  });
  const callback = search.meta ? callbackMessages[search.meta] : null;

  return (
    <AppFrame workspaceId={workspaceId} section="hub">
      <div className="h-full overflow-y-auto bg-[#fbfbfb]">
        <PageHeader workspaceId={workspaceId} />
        <main className="mx-auto max-w-[1120px] px-6 py-7 md:px-10 md:py-10">
          {callback ? (
            <output
              className={`mb-5 flex gap-3 rounded-2xl border p-4 ${search.meta === 'error' ? 'border-[#f0d3d1] bg-[#fff7f6]' : search.meta === 'cancelled' ? 'border-[#eadfb9] bg-[#fffbee]' : 'border-[#cce7d6] bg-[#f5fcf8]'}`}
            >
              {search.meta === 'error' ? (
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#cd2823]" />
              ) : search.meta === 'cancelled' ? (
                <Clock3 className="mt-0.5 size-5 shrink-0 text-[#8a6500]" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#287a4b]" />
              )}
              <div>
                <div className="font-semibold">{callback.title}</div>
                <div className="mt-0.5 text-[13px] text-[#636363]">
                  {callback.detail}
                  {search.reason ? ` Error code: ${search.reason}.` : ''}
                </div>
              </div>
            </output>
          ) : null}

          {query.isPending ? (
            <div className="grid min-h-[360px] place-items-center rounded-3xl border border-[#e0e0e0] bg-white">
              <div className="text-center text-[#636363]">
                <LoaderCircle className="mx-auto size-6 animate-spin" />
                <p className="mt-3">Checking Meta connection…</p>
              </div>
            </div>
          ) : query.isError ? (
            <div className="rounded-3xl border border-[#f0d3d1] bg-white p-8 text-center">
              <TriangleAlert className="mx-auto size-8 text-[#cd2823]" />
              <h2 className="mt-4 text-[21px] font-semibold">
                Could not load the connection
              </h2>
              <p className="mt-2 text-[#636363]">
                {getMutationMessage(query.error)}
              </p>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="mt-5 h-10 rounded-full bg-[#161616] px-5 font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : !query.data.configured ? (
            <SetupCard
              redirectUri={query.data.redirectUri}
              permissions={query.data.requiredPermissions}
            />
          ) : query.data.connection ? (
            <ConnectedView
              key={query.data.connection.updatedAt}
              workspaceId={workspaceId}
              data={query.data}
            />
          ) : (
            <DisconnectedCard
              workspaceId={workspaceId}
              permissions={query.data.requiredPermissions}
            />
          )}

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f1f3f6] p-4 text-[13px] leading-5 text-[#636363]">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#287a4b]" />
            Campaign-changing actions should still require explicit user
            confirmation and be recorded in an audit log before the AI agent is
            allowed to run them.
          </div>
        </main>
      </div>
    </AppFrame>
  );
}
