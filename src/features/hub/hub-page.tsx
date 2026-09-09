import { Link, useParams, useSearch } from '@tanstack/react-router';
import { Database, LoaderCircle, LockKeyhole, X } from 'lucide-react';
import { useWorkspaceJourney } from '@/src/features/connections/use-workspace-journey';

export function HubPage() {
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false }) as { workspaceId?: string };
  const workspaceId = params.workspaceId || search.workspaceId || 'demo';
  const journey = useWorkspaceJourney(workspaceId);
  const { sessionQuery, metaQuery } = journey;
  const pending =
    journey.loading || sessionQuery.isFetching || metaQuery.isFetching;
  const statusError =
    journey.phase === 'account-error' || journey.phase === 'meta-error';
  const actionClass =
    'mt-8 grid h-12 w-full place-items-center rounded-full bg-[#161616] text-[18px] font-semibold text-white hover:bg-[#2e2e2e] disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <main className="grid min-h-screen grid-cols-2 bg-white max-md:grid-cols-1">
      <section className="flex min-h-screen flex-col items-center justify-center bg-[#161616] p-10 text-center max-md:min-h-0 max-md:py-8">
        <div className="aster-gradient-wordmark text-[72px] font-black leading-none tracking-[-.07em] max-md:text-[46px]">
          ASTER
        </div>
        <div className="mt-4 flex items-center gap-2 text-white/40">
          <Database className="size-4" />
          <span className="text-[18px]">
            Your ad connections, clearly governed.
          </span>
        </div>
        <div className="mt-12 grid w-full max-w-sm grid-cols-3 gap-2 max-md:hidden">
          <div className="rounded-2xl border border-white/10 p-4 text-left">
            <div className="text-[12px] text-white/40">CONNECT</div>
            <div className="mt-8 text-white">Your ad source</div>
          </div>
          <div className="rounded-2xl border border-white/10 p-4 text-left">
            <div className="text-[12px] text-white/40">CONTROL</div>
            <div className="mt-8 text-white">Permissions</div>
          </div>
          <div className="rounded-2xl border border-white/10 p-4 text-left">
            <div className="text-[12px] text-white/40">SAVE</div>
            <div className="mt-8 text-white">Account selection</div>
          </div>
        </div>
      </section>
      <section className="relative flex min-h-screen items-center justify-center p-8 max-sm:p-4">
        <Link
          to="/workspaces/$workspaceId/overview"
          params={{ workspaceId }}
          aria-label="Close Connections"
          className="absolute right-6 top-6 grid h-12 w-14 place-items-center rounded-full bg-[#f2f2f2] transition-colors hover:bg-[#e8e8e8]"
        >
          <X className="size-4" />
        </Link>
        <div className="w-full max-w-[520px]">
          <div
            className="mb-10 flex gap-2"
            aria-label={
              journey.signedIn
                ? 'Aster account checked; Meta access next'
                : 'Start with your Aster account'
            }
          >
            {[0, 1].map((segment) => (
              <span
                key={segment}
                className={`h-1 w-[51px] rounded-full transition-colors ${segment === 0 || journey.signedIn ? 'bg-[#161616]' : 'bg-[#f2f2f2]'}`}
              />
            ))}
          </div>
          <h1 className="text-[36px] font-semibold leading-[43px] tracking-[-.02em]">
            Connections
          </h1>
          <p className="mt-2 text-[#636363]">
            Create or continue with Aster, authorize Meta Ads, then save your
            ad-account selection.
          </p>
          <div className="mt-8 grid gap-6">
            <div className="font-semibold">
              Meta Ads
              <div className="mt-1 flex min-h-12 w-full items-center rounded-2xl border border-[#e0e0e0] bg-white px-5 py-3">
                <output
                  className="flex items-center gap-2 text-[14px] font-semibold"
                  aria-live="polite"
                >
                  {pending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : null}
                  {journey.phase === 'campaigns'
                    ? 'Ad-account selection saved'
                    : journey.action.short}
                </output>
              </div>
              <p className="mt-2 text-[13px] font-normal leading-5 text-[#636363]">
                {journey.action.detail}
              </p>
            </div>
          </div>
          {statusError ? (
            <div className="mt-3 text-[13px] text-[#a52b27]" role="alert">
              {journey.phase === 'account-error'
                ? 'I could not check your Aster session.'
                : 'The Meta connection status could not be checked.'}
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  void (journey.phase === 'account-error'
                    ? sessionQuery.refetch()
                    : metaQuery.refetch())
                }
                className="mt-2 block font-semibold underline disabled:opacity-50"
              >
                {pending ? 'Checking…' : 'Check status again'}
              </button>
            </div>
          ) : null}
          <div className="mt-6 flex gap-3 rounded-2xl bg-[#f8f8f8] p-4">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            <p className="text-[13px] leading-[18px] text-[#636363]">
              Aster identity sign-in and Meta advertising authorization are
              separate. Saving accounts does not enable live reporting, publish
              ads, or spend money. An optional sample preview is available in
              Campaigns.
            </p>
          </div>
          {pending ? (
            <button type="button" disabled className={actionClass}>
              Checking your next step…
            </button>
          ) : (
            <Link {...journey.action.route} className={actionClass}>
              {journey.action.label}
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
