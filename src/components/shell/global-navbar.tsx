import { Link, useMatchRoute } from '@tanstack/react-router';
import { Activity, ChevronDown, Grid2X2, Menu, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { queryKeys } from '@/src/lib/query-keys';
import { demoApi } from '@/src/lib/demo-api';
import { authApi } from '@/src/lib/auth-api';
import { isDemoWorkspace } from '@/src/lib/workspaces';
import { AppTooltip } from '@/src/components/feedback/app-tooltip';
import type { Workspace } from '@/src/lib/types';

type Section = 'home' | 'performance' | 'stage' | 'hub';
const sectionLabels: Record<Section, string> = {
  home: 'Home',
  performance: 'Campaigns',
  stage: 'Creatives',
  hub: 'Connections',
};

const routeFor = (section: Section, workspaceId: string) => {
  if (section === 'home')
    return {
      to: '/workspaces/$workspaceId/overview' as const,
      params: { workspaceId },
    };
  if (section === 'performance')
    return {
      to: '/workspaces/$workspaceId/performance' as const,
      params: { workspaceId },
    };
  if (section === 'stage')
    return {
      to: '/workspaces/$workspaceId/stage' as const,
      params: { workspaceId },
    };
  return {
    to: '/workspaces/$workspaceId/connections/meta' as const,
    params: { workspaceId },
  };
};

function NavLink({
  label,
  section,
  workspaceId,
}: {
  label: string;
  section: Section;
  workspaceId: string;
}) {
  const matchRoute = useMatchRoute();
  const route = routeFor(section, workspaceId);
  const matcher =
    section === 'hub'
      ? { to: '/hub' as const }
      : section === 'home'
        ? {
            to: '/workspaces/$workspaceId/overview' as const,
            params: { workspaceId },
            fuzzy: true,
          }
        : section === 'performance'
          ? {
              to: '/workspaces/$workspaceId/performance' as const,
              params: { workspaceId },
              fuzzy: true,
            }
          : {
              to: '/workspaces/$workspaceId/stage' as const,
              params: { workspaceId },
              fuzzy: true,
            };
  const active =
    Boolean(matchRoute(matcher)) ||
    (section === 'home' &&
      Boolean(
        matchRoute({
          to: '/workspaces/$workspaceId/assistant',
          params: { workspaceId },
        }),
      )) ||
    (section === 'hub' &&
      Boolean(
        matchRoute({
          to: '/workspaces/$workspaceId/connections',
          params: { workspaceId },
        }),
      )) ||
    (section === 'hub' &&
      Boolean(
        matchRoute({
          to: '/workspaces/$workspaceId/connections/meta',
          params: { workspaceId },
        }),
      ));

  return (
    <Link
      {...route}
      aria-current={active ? 'page' : undefined}
      className={`focus-on-dark relative isolate flex h-9 items-center rounded-[10px] px-4 text-[15px] transition-colors duration-200 ${active ? 'font-semibold text-[#161616]' : 'text-white/80 hover:bg-white/20 hover:text-white'}`}
    >
      <span
        className={`absolute -bottom-1.5 left-0 right-0 -z-10 h-[42px] rounded-t-xl bg-white transition-all duration-200 ${active ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
      >
        <svg
          className="absolute -bottom-0 left-[-12px] size-3 fill-white"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M12 0V12H0C6.627 12 12 6.627 12 0Z" />
        </svg>
        <svg
          className="absolute -bottom-0 right-[-12px] size-3 rotate-90 fill-white"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M12 0V12H0C6.627 12 12 6.627 12 0Z" />
        </svg>
      </span>
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

function WorkspaceButton({
  workspace,
  open,
  onToggle,
}: {
  workspace: Workspace;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="group focus-on-dark relative flex h-11 w-[284px] max-w-[calc(100vw-112px)] items-center gap-3 overflow-hidden rounded-2xl px-2 text-left text-white transition-colors hover:bg-white/10"
      aria-expanded={open}
      aria-controls="workspace-drawer"
      onClick={onToggle}
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-[10px] text-[12px] font-bold text-[#16251f]"
        style={{ background: workspace.accent }}
      >
        {workspace.initials}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[18px] font-[550] leading-5">
        <span className="truncate">{workspace.name}</span>
        {isDemoWorkspace(workspace.id) && (
          <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-3 text-white/70">
            Demo
          </span>
        )}
      </span>
      <ChevronDown
        className={`size-3 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : 'group-hover:translate-y-0'} opacity-80`}
      />
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-full bg-white/10 transition-all duration-200 ${open ? 'opacity-100' : '-ml-10 w-0 opacity-0 group-hover:ml-0 group-hover:w-8 group-hover:opacity-100'}`}
      >
        <Settings className="size-4 transition-transform duration-200 group-hover:rotate-45" />
      </span>
    </button>
  );
}

export function GlobalNavbar({
  workspaceId,
  drawerOpen,
  onDrawerToggle,
}: {
  workspaceId: string;
  drawerOpen: boolean;
  onDrawerToggle: () => void;
}) {
  const { data: workspace } = useQuery({
    queryKey: queryKeys.workspace(workspaceId),
    queryFn: ({ signal }) => demoApi.getWorkspace(workspaceId, signal),
  });
  const { data: account } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.session,
    retry: false,
  });
  const connectionWorkspaceId =
    isDemoWorkspace(workspaceId) && account?.user
      ? account.user.defaultWorkspaceId
      : workspaceId;
  const ownWorkspace = account?.workspaces.find(
    (item) => item.id === workspaceId,
  );
  const safeWorkspace = {
    ...(workspace ?? {
      id: workspaceId,
      name: 'Your workspace',
      initials: 'AW',
      accent: '#91e5b2',
      accountCount: 0,
    }),
    ...(ownWorkspace
      ? {
          name: ownWorkspace.name,
          initials: ownWorkspace.name
            .split(' ')
            .map((part) => part[0] ?? '')
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        }
      : {}),
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center justify-between px-2">
      <WorkspaceButton
        workspace={safeWorkspace}
        open={drawerOpen}
        onToggle={onDrawerToggle}
      />
      <nav
        className="absolute left-1/2 hidden h-9 -translate-x-1/2 items-center gap-1.5 lg:flex"
        aria-label="Workspace navigation"
      >
        <NavLink label="Home" section="home" workspaceId={workspaceId} />
        <NavLink
          label="Campaigns"
          section="performance"
          workspaceId={workspaceId}
        />
        <NavLink label="Creatives" section="stage" workspaceId={workspaceId} />
        <NavLink
          label="Connections"
          section="hub"
          workspaceId={connectionWorkspaceId}
        />
      </nav>
      <div className="flex items-center gap-1">
        <AppTooltip label="Workspace activity" side="bottom">
          <Link
            to="/workspaces/$workspaceId/performance/activity"
            params={{ workspaceId }}
            aria-label="View workspace activity"
            className="focus-on-dark hidden size-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:grid"
          >
            <Activity className="size-[18px]" />
          </Link>
        </AppTooltip>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label="Open navigation menu"
                className="focus-on-dark grid size-9 place-items-center rounded-full text-white hover:bg-white/10 lg:hidden"
              />
            }
          >
            <Menu className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Go to</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {(['home', 'performance', 'stage', 'hub'] as const).map(
              (section) => (
                <DropdownMenuItem
                  key={section}
                  render={
                    <Link
                      {...routeFor(
                        section,
                        section === 'hub' ? connectionWorkspaceId : workspaceId,
                      )}
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-2 capitalize"
                    />
                  }
                >
                  <Grid2X2 className="size-4" />
                  {sectionLabels[section]}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
