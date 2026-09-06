import { AlertTriangle, RotateCcw } from 'lucide-react';

export function PageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid gap-3 ${compact ? '' : 'p-8'}`}
      aria-label="Loading content"
    >
      <div className="h-8 w-44 animate-pulse rounded-xl bg-[#f2f2f2]" />
      <div className="h-28 animate-pulse rounded-2xl bg-[#f8f8f8]" />
      <div className="h-52 animate-pulse rounded-2xl bg-[#f8f8f8]" />
    </div>
  );
}

export function QueryError({ retry }: { retry?: () => void }) {
  return (
    <div className="m-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-[#cd2823]">
        <AlertTriangle className="size-5" />
      </span>
      <h2 className="text-[24px] font-semibold leading-[29px]">
        We couldn’t load this view
      </h2>
      <p className="text-[#636363]">
        The demo service was interrupted. Your workspace data is safe.
      </p>
      {retry ? (
        <button
          className="mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-[#161616] px-4 font-semibold text-white hover:bg-[#2e2e2e]"
          onClick={retry}
        >
          <RotateCcw className="size-4" /> Retry
        </button>
      ) : null}
    </div>
  );
}
