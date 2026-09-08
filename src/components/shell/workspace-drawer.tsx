import { Link } from '@tanstack/react-router';
import {
  Building2,
  CreditCard,
  Handshake,
  LogOut,
  Plus,
  Settings,
  UserRound,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { demoApi } from '@/src/lib/demo-api';

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
  const { data = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: ({ signal }) => demoApi.getWorkspaces(signal),
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
    <aside
      id="workspace-drawer"
      aria-hidden={!open}
      className={`fixed bottom-0 left-0 top-12 z-0 flex w-[300px] flex-col py-2 text-white transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <Link
        to="/hub"
        className={`${rowClass} mx-2 ${open ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
        style={{ transitionTimingFunction: 'var(--ease-overshoot)' }}
        onClick={onClose}
      >
        <span className="grid size-8 place-items-center rounded-full bg-white/20">
          <Plus className="size-4" />
        </span>
        <span className="font-medium">Add workspace</span>
      </Link>
      <div className="mt-3 grid gap-1 px-2">
        {data
          .filter((workspace) => workspace.id !== workspaceId)
          .map((workspace) => (
            <Link
              key={workspace.id}
              {...routeForWorkspace(workspace.id)}
              className={rowClass}
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
                {workspace.accountCount}
              </span>
            </Link>
          ))}
      </div>
      <div className="mt-auto px-2">
        <div className={rowClass}>
          <span className="grid size-8 place-items-center rounded-full bg-white/20">
            <Building2 className="size-4" />
          </span>
          <span>Northstar Group</span>
        </div>
        <button
          className={rowClass}
          onClick={() =>
            toast('Workspace settings', {
              description:
                'Settings are represented as a demo action in this frontend.',
            })
          }
        >
          <span className="grid size-8 place-items-center rounded-full bg-white/10">
            <Settings className="size-4 transition-transform group-hover:rotate-45 group-hover:scale-110" />
          </span>
          <span>Settings</span>
        </button>
        <button
          className={rowClass}
          onClick={() =>
            toast('Billing overview', {
              description: 'No billing information is connected in demo mode.',
            })
          }
        >
          <span className="grid size-8 place-items-center rounded-full bg-white/10">
            <CreditCard className="size-4" />
          </span>
          <span>Billing</span>
        </button>
        <div className="my-2 h-px bg-white/10" />
        <button
          className={rowClass}
          onClick={() =>
            toast('Partner program', {
              description:
                'Partner applications will be available from account settings.',
            })
          }
        >
          <span className="grid size-8 place-items-center rounded-full bg-white/10">
            <Handshake className="size-4 transition-transform group-hover:-translate-y-0.5" />
          </span>
          <span>Partner program</span>
        </button>
        <div className={`${rowClass} group`}>
          <span className="grid size-8 place-items-center rounded-full bg-white/10">
            <UserRound className="size-4 transition-transform group-hover:-translate-y-0.5" />
          </span>
          <span className="min-w-0 flex-1 truncate">Alex Morgan</span>
          <LogOut className="size-4 transition-transform group-hover:-translate-x-1" />
        </div>
      </div>
    </aside>
  );
}
