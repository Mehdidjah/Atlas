import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Building2, LogOut, Settings, UserRound } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { demoApi } from '@/src/lib/demo-api';
import { authApi } from '@/src/lib/auth-api';

export function WorkspaceDrawer({
  open,
  section,
  workspaceId,
  onClose,
}: {
  open: boolean;
  section: 'home' | 'performance' | 'stage' | 'hub';
  workspaceId: string;
  onClose: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: sampleWorkspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: ({ signal }) => demoApi.getWorkspaces(signal),
  });
  const { data: account } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.session,
    retry: false,
  });
  const { data: providers } = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: authApi.providers,
    retry: false,
  });
  const data = account?.user
    ? account.workspaces.map((workspace) => ({
        ...workspace,
        initials: workspace.name
          .split(' ')
          .map((part) => part[0] ?? '')
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        accent: '#91e5b2',
        accountCount: 0,
      }))
    : sampleWorkspaces;
  const hostedSession =
    account?.user?.defaultWorkspaceId === 'demo' && providers?.hosted;
  const logout = useMutation({
    mutationFn: authApi.signOut,
    onSuccess: () => window.location.assign('/sign-in'),
    onError: (error) => toast.error(error.message),
  });
  const routeForWorkspace = (id: string) =>
    section === 'home'
      ? {
          to: '/workspaces/$workspaceId/overview' as const,
          params: { workspaceId: id },
        }
      : section === 'performance'
        ? {
            to: '/workspaces/$workspaceId/performance' as const,
            params: { workspaceId: id },
          }
        : section === 'stage'
          ? {
              to: '/workspaces/$workspaceId/stage' as const,
              params: { workspaceId: id },
            }
          : {
              to: '/workspaces/$workspaceId/connections/meta' as const,
              params: { workspaceId: id },
            };
  const rowClass =
    'group flex h-11 w-[284px] items-center gap-3 rounded-2xl px-2 text-white/80 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-on-dark';

  return (
    <>
      <aside
        id="workspace-drawer"
        aria-hidden={!open}
        inert={!open}
        className={`fixed bottom-0 left-0 top-12 z-0 flex w-[300px] max-w-full flex-col overflow-y-auto py-2 text-white transition-opacity duration-200 max-lg:z-40 max-lg:bg-[linear-gradient(180deg,var(--frame-start),var(--frame-end))] ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <p className="px-4 py-2 text-[12px] font-semibold text-white/60">
          {account?.user ? 'Your workspaces' : 'Sample workspaces'}
        </p>
        <div className="mt-3 grid gap-1 px-2">
          {data.map((workspace) => (
            <Link
              key={workspace.id}
              {...routeForWorkspace(workspace.id)}
              aria-current={workspace.id === workspaceId ? 'page' : undefined}
              className={`${rowClass} ${workspace.id === workspaceId ? 'bg-white/10 text-white' : ''}`}
              onClick={onClose}
            >
              <span
                className="grid size-8 place-items-center rounded-[10px] text-xs font-bold text-[#16251f]"
                style={{ background: workspace.accent }}
              >
                {workspace.initials}
              </span>
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
              <span className="text-xs text-white/50">
                {workspace.id === workspaceId
                  ? 'Current'
                  : account?.user
                    ? ''
                    : 'Demo'}
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-auto px-2">
          <div className={rowClass}>
            <span className="grid size-8 place-items-center rounded-full bg-white/20">
              <Building2 className="size-4" />
            </span>
            <span>
              {account?.user ? 'Personal workspace' : 'Demo workspace'}
            </span>
          </div>
          <button className={rowClass} onClick={() => setSettingsOpen(true)}>
            <span className="grid size-8 place-items-center rounded-full bg-white/10">
              <Settings className="size-4 transition-transform group-hover:rotate-45 group-hover:scale-110" />
            </span>
            <span>Account details</span>
          </button>
          <div className="my-2 h-px bg-white/10" />
          {account?.user && !hostedSession ? (
            <button
              className={`${rowClass} group`}
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <span className="grid size-8 place-items-center rounded-full bg-white/10">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {logout.isPending ? 'Signing out…' : 'Sign out'}
              </span>
              <LogOut className="size-4" />
            </button>
          ) : hostedSession ? (
            // Hosted sign-out is server-owned and requires a top-level navigation.
            // oxlint-disable-next-line next/no-html-link-for-pages
            <a
              href="/signout-with-chatgpt?return_to=/sign-in"
              target="_top"
              className={`${rowClass} group`}
            >
              <span className="grid size-8 place-items-center rounded-full bg-white/10">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">Sign out</span>
              <LogOut className="size-4" />
            </a>
          ) : (
            <Link
              to="/sign-in"
              className={`${rowClass} group`}
              onClick={onClose}
            >
              <span className="grid size-8 place-items-center rounded-full bg-white/10">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">Sign in to Aster</span>
              <LogOut className="size-4" />
            </Link>
          )}
        </div>
      </aside>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="w-[560px] max-w-[calc(100vw-32px)] rounded-[24px] p-6">
          <DialogTitle className="text-[24px] font-semibold">
            Account details
          </DialogTitle>
          <DialogDescription className="text-[#636363]">
            Your Aster identity is separate from Meta advertising access. Manage
            advertising access from Connections.
          </DialogDescription>
          <div className="mt-4 rounded-2xl bg-[#f8f8f8] p-4 text-[14px]">
            {account?.user
              ? `Signed in as ${account.user.name ?? account.user.email ?? 'an Aster member'}.`
              : 'You are exploring the demo without an Aster account.'}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/sign-in" className="button-primary">
              {account?.user ? 'Open account page' : 'Sign in to Aster'}
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
