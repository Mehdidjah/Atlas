import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p
      role="alert"
      className="my-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      {error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.'}
    </p>
  ) : null;
}
export function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <output className="block mb-4 rounded-xl bg-[#def4e7] p-3 text-[13px] text-[#256b43]">
      {children}
    </output>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cccccc] p-10 text-center">
      <h2 className="font-semibold text-[#161616]">{title}</h2>
      <div className="mx-auto mt-2 max-w-md text-sm text-[#636363]">
        {children}
      </div>
    </div>
  );
}
export function LoadingState() {
  return (
    <output className="block rounded-2xl border border-[#e8e8e8] p-8 text-sm text-[#636363]">
      Loading…
    </output>
  );
}
export function useRefreshPerformance(workspaceId: string) {
  const client = useQueryClient();
  return () =>
    Promise.all(
      ['campaigns', 'dashboard', 'drafts', 'activity', 'rules'].map((key) =>
        client.invalidateQueries({ queryKey: [key, workspaceId] }),
      ),
    );
}
export const inputClass =
  'mt-1 h-12 w-full rounded-2xl border border-[#e0e0e0] bg-white px-5 font-normal outline-none hover:border-[#cccccc] focus:border-[#9e9e9e]';
