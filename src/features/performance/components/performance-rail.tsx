import { Link } from '@tanstack/react-router';
import { Activity, BarChart3, Rocket, ShieldCheck } from 'lucide-react';

const items = [
  {
    key: 'rules',
    label: 'Rules',
    detail: 'Guardrails and automation',
    icon: ShieldCheck,
    to: '/workspaces/$workspaceId/performance/rules' as const,
  },
  {
    key: 'analyze',
    label: 'Analyze',
    detail: 'Trends and opportunities',
    icon: BarChart3,
    to: '/workspaces/$workspaceId/performance/analyze' as const,
  },
  {
    key: 'launch',
    label: 'Launch',
    detail: 'Create a campaign draft',
    icon: Rocket,
    to: '/workspaces/$workspaceId/performance/launch' as const,
  },
  {
    key: 'activity',
    label: 'Activity',
    detail: 'Agent and account changes',
    icon: Activity,
    to: '/workspaces/$workspaceId/performance/activity' as const,
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
      aria-label="Performance tools"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = mode === item.key;
        return (
          <div key={item.key} className="group relative mb-3 h-9 w-9">
            <Link
              to={item.to}
              params={{ workspaceId }}
              aria-label={item.label}
              className={`grid size-9 place-items-center rounded-lg transition-colors ${active ? 'bg-[#e8e8e8]' : 'hover:bg-[#f2f2f2]'}`}
            >
              <Icon className="size-5" />
            </Link>
            <div className="pointer-events-none absolute left-[50px] top-0 z-50 w-[286px] translate-x-[-4px] rounded-2xl bg-white p-2 opacity-0 shadow-[var(--shadow-flyout)] transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100">
              <div className="flex h-9 items-center px-2 text-[12px] font-semibold uppercase tracking-[.08em] text-[#636363]">
                {item.label}
              </div>
              {items.map((link) => (
                <Link
                  key={link.key}
                  to={link.to}
                  params={{ workspaceId }}
                  className="flex h-9 items-center justify-between rounded-lg px-2 hover:bg-[#f2f2f2] focus:bg-[#f2f2f2]"
                >
                  <span>{link.label}</span>
                  <span className="text-[12px] text-[#9e9e9e]">
                    {link.key === item.key ? 'Current' : ''}
                  </span>
                </Link>
              ))}
              <p className="mt-1 rounded-lg bg-[#f8f8f8] px-2 py-2 text-[12px] text-[#636363]">
                {item.detail}
              </p>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
