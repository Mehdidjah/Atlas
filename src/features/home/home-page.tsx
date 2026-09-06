import { useState } from 'react';
import { ExternalLink, Menu, Sparkles } from 'lucide-react';
import { useParams, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AppFrame } from '@/src/components/shell/app-frame';
import { AiComposer } from '@/src/features/home/components/ai-composer';
import { HomeSidebar } from '@/src/features/home/components/home-sidebar';
import { HomeHighlights } from '@/src/features/home/components/home-highlights';
import { BusinessContextDialog } from '@/src/features/home/components/business-context-dialog';
import { demoApi } from '@/src/lib/demo-api';
import { queryKeys } from '@/src/lib/query-keys';
import type { DashboardFilters } from '@/src/lib/types';

export function HomePage() {
  const { workspaceId } = useParams({ strict: false }) as {
    workspaceId: string;
  };
  const search = useSearch({ strict: false }) as {
    demo?: 'empty' | 'populated';
  };
  const [contextOpen, setContextOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const filters: DashboardFilters = {
    range: '30d',
    compare: 'previous',
    channel: 'All channels',
    status: 'All statuses',
    search: '',
    demo:
      search.demo ??
      (import.meta.env.VITE_DEMO_STATE === 'empty' ? 'empty' : 'populated'),
  };
  const { data } = useQuery({
    queryKey: queryKeys.dashboard(workspaceId, filters),
    queryFn: ({ signal }) => demoApi.getDashboard(filters, signal),
  });

  return (
    <AppFrame workspaceId={workspaceId} section="home">
      <div className="flex h-full min-w-0">
        <div className="hidden w-[260px] shrink-0 border-r border-[#e8e8e8] md:block">
          <HomeSidebar
            workspaceId={workspaceId}
            onEditContext={() => setContextOpen(true)}
          />
        </div>
        <main className="scrollbar-subtle min-w-0 flex-1 overflow-y-auto px-6 max-md:px-4">
          <div className="mx-auto max-w-[1500px] pb-8">
            <div className="flex min-h-20 items-center justify-between gap-3 pt-4">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger
                  render={
                    <button
                      aria-label="Open Home navigation"
                      className="grid size-11 place-items-center rounded-full bg-[#f2f2f2] md:hidden"
                    />
                  }
                >
                  <Menu className="size-5" />
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[286px] max-w-[85vw] gap-0 p-0"
                  showCloseButton={true}
                >
                  <SheetTitle className="sr-only">Home navigation</SheetTitle>
                  <SheetDescription className="sr-only">
                    Chats and workspace tools
                  </SheetDescription>
                  <div className="mt-12 min-h-0 flex-1">
                    <HomeSidebar
                      workspaceId={workspaceId}
                      onNavigate={() => setMobileNavOpen(false)}
                      onEditContext={() => {
                        setMobileNavOpen(false);
                        setContextOpen(true);
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              <a
                href="https://cal.com"
                target="_blank"
                rel="noreferrer"
                className="surface-shadow flex h-14 w-60 items-center gap-2 rounded-full px-3 transition-shadow max-sm:w-auto"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e7dcff] text-[#734ede]">
                  <Sparkles className="size-5" />
                </span>
                <span className="min-w-0 flex-1 max-sm:hidden">
                  <span className="block font-semibold">Talk to an expert</span>
                  <span className="block text-[13px] text-[#636363]">
                    Build your first workflow
                  </span>
                </span>
                <span className="text-lg">→</span>
              </a>
              <a
                href="https://example.com/guide"
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex h-8 items-center gap-2 rounded-full px-3 font-[550] transition-colors hover:bg-[#f2f2f2]"
              >
                Prompting guide <ExternalLink className="size-4" />
              </a>
            </div>
            <section
              className="mx-auto mt-12 max-w-[712px]"
              aria-labelledby="ai-title"
            >
              <h1
                id="ai-title"
                className="mb-5 text-center text-[24px] font-semibold leading-[29px] tracking-[-.01em]"
              >
                What should we work on?
              </h1>
              <AiComposer
                workspaceId={workspaceId}
                onEditContext={() => setContextOpen(true)}
              />
              {data && data.metrics.length ? (
                <HomeHighlights data={data} />
              ) : (
                <div className="mt-16 border-t border-[#e8e8e8] pb-10 pt-8 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f2f2f2] text-[#734ede]">
                    <Sparkles className="size-6" />
                  </span>
                  <h2 className="mt-3 font-semibold">
                    Connect an ad account to see live highlights
                  </h2>
                  <button className="mt-4 h-10 rounded-full bg-[#161616] px-5 font-semibold text-white hover:bg-[#2e2e2e]">
                    Connect an account
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      <BusinessContextDialog
        workspaceId={workspaceId}
        open={contextOpen}
        onOpenChange={setContextOpen}
      />
    </AppFrame>
  );
}
