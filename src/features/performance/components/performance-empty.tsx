import { Link } from '@tanstack/react-router';
import { useWorkspaceJourney } from '@/src/features/connections/use-workspace-journey';

export function PerformanceEmpty({
  workspaceId,
  recommendations = false,
}: {
  workspaceId: string;
  recommendations?: boolean;
}) {
  const journey = useWorkspaceJourney(workspaceId);
  const route = journey.metaReady
    ? journey.routes.drafts
    : journey.action.route;
  const detail = journey.metaReady
    ? recommendations
      ? 'Your Meta ad-account selection is saved. Live recommendations and reporting are not implemented yet. You can prepare a campaign draft for review.'
      : 'Your Meta ad-account selection is saved. Live reporting is not implemented yet. Prepare a campaign draft while reporting is unavailable.'
    : journey.action.detail;
  return (
    <div className="mx-auto flex max-w-[650px] flex-col items-center py-14 text-center">
      <svg
        className="h-[180px] w-full max-w-[450px]"
        viewBox="0 0 450 180"
        aria-label="Floating analytics cards illustration"
      >
        <path
          d="M88 134c52-39 213-53 279-8"
          fill="none"
          stroke="#e8e8e8"
          strokeWidth="2"
          strokeDasharray="5 7"
        />
        <g transform="translate(42 38) rotate(-6 70 50)">
          <rect width="140" height="98" rx="18" fill="white" stroke="#e8e8e8" />
          <rect x="16" y="16" width="36" height="36" rx="10" fill="#d8f5e4" />
          <path
            d="m27 38 7-9 7 5 6-9"
            fill="none"
            stroke="#287a4b"
            strokeWidth="2"
          />
          <rect x="16" y="69" width="84" height="8" rx="4" fill="#f2f2f2" />
        </g>
        <g transform="translate(156 16)">
          <rect
            width="142"
            height="112"
            rx="18"
            fill="white"
            stroke="#e8e8e8"
          />
          <rect x="16" y="16" width="110" height="10" rx="5" fill="#eee8ff" />
          <path
            d="M18 83c18-2 22-29 43-20s25-34 48-19"
            fill="none"
            stroke="#734ede"
            strokeWidth="3"
          />
          <circle cx="109" cy="44" r="4" fill="#734ede" />
        </g>
        <g transform="translate(286 48) rotate(7 60 45)">
          <rect width="122" height="88" rx="18" fill="white" stroke="#e8e8e8" />
          <circle cx="34" cy="32" r="18" fill="#d9f5f7" />
          <path d="M34 21v22M23 32h22" stroke="#21888e" strokeWidth="2" />
          <rect x="16" y="64" width="74" height="8" rx="4" fill="#fff0a2" />
        </g>
      </svg>
      <h2 className="mt-5 text-[24px] font-semibold leading-[29px]">
        {journey.action.title}
      </h2>
      <p className="mt-2 text-[20px] leading-7 text-[#636363]">{detail}</p>
      {journey.loading ? (
        <output className="mt-6 text-sm text-[#636363]">
          {journey.action.short}
        </output>
      ) : (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            {...route}
            className="grid h-9 min-w-[170px] place-items-center rounded-[18px] border border-[#e0e0e0] bg-white px-5 text-[15px] font-semibold transition-colors hover:bg-[#f8f8f8]"
          >
            {journey.metaReady ? 'Prepare a draft' : journey.action.label}
          </Link>
          {journey.phase === 'sign-in' && (
            <Link
              {...journey.routes.signIn}
              className="grid h-9 place-items-center rounded-[18px] px-5 text-[15px] font-semibold text-[#636363] hover:bg-[#f2f2f2]"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
