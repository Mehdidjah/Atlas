import { Link } from '@tanstack/react-router';
import {
  Activity,
  BarChart3,
  FileText,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import { AppTooltip } from '@/src/components/feedback/app-tooltip';

const items = [
  {
    key: 'overview',
    label: 'Campaigns',
    icon: LayoutDashboard,
    to: '/workspaces/$workspaceId/performance' as const,
  },
  {
    key: 'launch',
    label: 'Drafts & approvals',
    icon: FileText,
    to: '/workspaces/$workspaceId/performance/launch' as const,
  },
  {
    key: 'analyze',
    label: 'Recommendations',
    icon: BarChart3,
    to: '/workspaces/$workspaceId/performance/analyze' as const,
  },
  {
    key: 'activity',
    label: 'Activity',
    icon: Activity,
    to: '/workspaces/$workspaceId/performance/activity' as const,
  },
  {
    key: 'rules',
    label: 'Automation rules (preview)',
    icon: ShieldCheck,
    to: '/workspaces/$workspaceId/performance/rules' as const,
  },
] as const;

export function PerformanceRail({
  workspaceId,
  mode,
}: {
  workspaceId: string;
  mode: string;
}) {
  return (
    <aside
      className="relative z-20 flex h-full w-[60px] shrink-0 flex-col items-center border-r border-[#e8e8e8] bg-white pb-4 pt-3"
      aria-label="Campaign tools"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = mode === item.key;
        return (
          <div key={item.key} className="relative mb-3 h-9 w-9">
            <AppTooltip label={item.label} side="right">
              <Link
                to={item.to}
                params={{ workspaceId }}
                activeOptions={{ exact: true, includeSearch: false }}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`grid size-9 place-items-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? 'bg-[#e8e8e8]' : 'hover:bg-[#f2f2f2]'}`}
              >
                <Icon className="size-5" aria-hidden="true" />
              </Link>
            </AppTooltip>
          </div>
        );
      })}
    </aside>
  );
}
