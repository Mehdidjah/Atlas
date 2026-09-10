import { useState } from 'react';
import { Check, CircleHelp, Menu, Sparkles } from 'lucide-react';
import { Link, useParams } from '@tanstack/react-router';
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
import { useWorkspaceJourney } from '@/src/features/connections/use-workspace-journey';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHomeFilters } from './home-filters';
export { useHomeFilters } from './home-filters';
export { AssistantPage } from './assistant-page';

export function HomePage() {
  const { workspaceId = 'demo', chatId } = useParams({ strict: false });
  return (
    <HomeWorkspace
      key={workspaceId}
      workspaceId={workspaceId}
      chatId={chatId}
    />
  );
}

function HomeWorkspace({
  workspaceId,
  chatId,
}: {
  workspaceId: string;
  chatId?: string;
}) {
  const [contextOpen, setContextOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [help, setHelp] = useState<'guide' | 'preferences' | null>(null);
  const [enterToSend, setEnterToSend] = useState(true);
  const [pending, setPending] = useState(false);
  const [promptRequest, setPromptRequest] = useState<{
    prompt: string;
    id: number;
  }>();
  const filters = useHomeFilters();
  const journey = useWorkspaceJourney(workspaceId);
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard(workspaceId, filters),
    queryFn: ({ signal }) => demoApi.getDashboard(filters, signal, workspaceId),
  });
  const { data } = dashboard;
  const chats = useQuery({
    queryKey: queryKeys.chats(workspaceId),
    queryFn: ({ signal }) => demoApi.getChats(workspaceId, signal),
  });
  const selected = chats.data?.find((chat) => chat.id === chatId);
  const journeyPillClass =
    'surface-shadow flex h-14 w-60 items-center gap-2 rounded-full px-3 transition-shadow max-sm:w-auto';
  const journeyPillContent = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e7dcff] text-[#734ede]">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold max-sm:text-[13px]">
          {journey.action.title}
        </span>
        <span className="block truncate text-[13px] text-[#636363] max-sm:hidden">
          {journey.action.short}
        </span>
      </span>
      <span className="text-lg" aria-hidden="true">
        {journey.loading ? '…' : '→'}
      </span>
    </>
  );
  const emptyHighlightsDetail = journey.metaReady
    ? 'Your Meta connection is saved with ' +
      journey.selectedCount +
      ' selected ad account' +
      (journey.selectedCount === 1 ? '' : 's') +
      '. Live campaign reporting is not available yet; the demo uses sample data. You can prepare a draft for review without publishing ads.'
    : journey.action.detail;

  return (
    <AppFrame workspaceId={workspaceId} section="home">
      <div className="flex h-full min-w-0">
        <div className="hidden w-[260px] shrink-0 border-r border-[#e8e8e8] md:block">
          <HomeSidebar
            workspaceId={workspaceId}
            disabled={pending}
            onPreferences={() => setHelp('preferences')}
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
                      disabled={pending}
                      onPreferences={() => {
                        setMobileNavOpen(false);
                        setHelp('preferences');
                      }}
                      onNavigate={() => setMobileNavOpen(false)}
                      onEditContext={() => {
                        setMobileNavOpen(false);
                        setContextOpen(true);
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              {journey.loading ? (
                <output
                  aria-label={journey.action.short}
                  className={journeyPillClass}
                >
                  {journeyPillContent}
                </output>
              ) : (
                <Link
                  {...journey.action.route}
                  aria-label={[
                    journey.action.title,
                    journey.action.short,
                    journey.action.label,
                  ].join('. ')}
                  title={journey.action.detail}
                  className={journeyPillClass}
                >
                  {journeyPillContent}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setHelp('guide')}
                aria-label="How Aster works"
                title="How Aster works"
                className="ml-auto flex h-8 items-center gap-2 rounded-full px-3 font-[550] transition-colors hover:bg-[#f2f2f2]"
              >
                <span className="max-sm:hidden">How Aster works</span>
                <CircleHelp className="size-4" aria-hidden="true" />
              </button>
            </div>
            <section
              className="mx-auto mt-12 max-w-[712px]"
              aria-labelledby="ai-title"
            >
              <h1
                id="ai-title"
                className="mb-5 text-center text-[24px] font-semibold leading-[29px] tracking-[-.01em]"
              >
                Aster, your advertising assistant
              </h1>
              <ol
                aria-label="Account to campaign setup"
                className="-mt-3 mb-3 flex min-h-7 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] leading-5 text-[#636363]"
              >
                {journey.steps.map((step) => (
                  <li
                    key={step.number}
                    aria-current={
                      step.current && !journey.loading ? 'step' : undefined
                    }
                    className={
                      'flex items-center gap-1.5 ' +
                      (step.current && !journey.loading
                        ? 'font-medium text-[#161616]'
                        : '')
                    }
                  >
                    {step.complete ? (
                      <>
                        <Check className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">Completed: </span>
                      </>
                    ) : (
                      <span aria-hidden="true">{step.number}.</span>
                    )}
                    {step.label}
                  </li>
                ))}
              </ol>
              {chatId && chats.isPending ? (
                <output className="block py-5 text-center text-[#636363]">
                  Loading conversation…
                </output>
              ) : chatId && chats.isError ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-[#e8e8e8] p-5"
                >
                  Could not load this conversation.{' '}
                  <button
                    className="underline"
                    onClick={() => void chats.refetch()}
                  >
                    Retry
                  </button>
                </div>
              ) : chatId && !selected ? (
                <div className="rounded-2xl border border-[#e8e8e8] p-5">
                  <h2 className="font-semibold">Conversation not found</h2>
                  <p className="mt-2 text-[#636363]">
                    This chat is not saved in this workspace and browser. Choose
                    a chat from the sidebar or start a new one.
                  </p>
                  <Link
                    to="/workspaces/$workspaceId/overview"
                    params={{ workspaceId }}
                    className="mt-4 inline-flex h-10 items-center rounded-full bg-[#161616] px-5 font-semibold text-white hover:bg-[#2e2e2e]"
                  >
                    Start a conversation
                  </Link>
                </div>
              ) : (
                <AiComposer
                  key={`${workspaceId}:${chatId ?? 'new'}`}
                  workspaceId={workspaceId}
                  chatId={chatId}
                  title={selected?.title}
                  enterToSend={enterToSend}
                  promptRequest={promptRequest}
                  onPromptConsumed={() => setPromptRequest(undefined)}
                  onPendingChange={setPending}
                  onEditContext={() => setContextOpen(true)}
                />
              )}
              {data && data.metrics.length ? (
                <HomeHighlights
                  data={data}
                  onChooseOpportunity={(prompt) =>
                    setPromptRequest({ prompt, id: Date.now() })
                  }
                />
              ) : (
                <div className="mt-16 border-t border-[#e8e8e8] pb-10 pt-8 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f2f2f2] text-[#734ede]">
                    <Sparkles className="size-6" />
                  </span>
                  <h2 className="mt-3 font-semibold">
                    {dashboard.isPending
                      ? 'Loading highlights…'
                      : dashboard.isError
                        ? 'Highlights unavailable'
                        : journey.metaReady
                          ? 'Meta connection saved'
                          : journey.action.title}
                  </h2>
                  {dashboard.isPending || dashboard.isError ? (
                    <p
                      role={dashboard.isError ? 'alert' : 'status'}
                      className="mt-2 text-[13px] text-[#636363]"
                    >
                      {dashboard.isPending
                        ? 'Loading workspace highlights…'
                        : 'Workspace highlights could not be loaded. Retrying will not change your saved connection.'}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[13px] text-[#636363]">
                    {emptyHighlightsDetail}
                  </p>
                  {dashboard.isError ? (
                    <button
                      onClick={() => void dashboard.refetch()}
                      className="mt-3 underline"
                    >
                      Retry highlights
                    </button>
                  ) : null}
                  {!journey.loading ? (
                    <Link
                      {...(journey.metaReady
                        ? journey.routes.drafts
                        : journey.action.route)}
                      className="mt-4 inline-flex h-10 items-center rounded-full bg-[#161616] px-5 font-semibold text-white hover:bg-[#2e2e2e]"
                    >
                      {journey.metaReady
                        ? 'Prepare a draft'
                        : journey.action.label}
                    </Link>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      <Dialog
        open={help !== null}
        onOpenChange={(open) => {
          if (!open) setHelp(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[calc(100vw-32px)] overflow-y-auto rounded-3xl p-6 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[24px] font-semibold">
              {help === 'preferences' ? 'Chat preferences' : 'How Aster works'}
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-6 text-[#636363]">
              {help === 'preferences'
                ? 'Choose how to send messages on this page.'
                : 'Start with your Aster account, connect Meta, then review campaigns and prepare drafts.'}
            </DialogDescription>
          </DialogHeader>
          {help === 'preferences' ? (
            <label className="flex items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={enterToSend}
                onChange={(event) => setEnterToSend(event.target.checked)}
                className="size-4 accent-[#161616]"
              />
              Enter sends messages
            </label>
          ) : (
            <>
              <ol className="list-decimal space-y-3 pl-5 text-[13px] leading-5 text-[#636363]">
                <li>
                  <strong className="font-semibold text-[#161616]">
                    Create an Aster account.
                  </strong>{' '}
                  Sign up or sign in with Google or Facebook. This is your Aster
                  login, not permission to access Meta ads.
                </li>
                <li>
                  <strong className="font-semibold text-[#161616]">
                    Connect Meta in Connections.
                  </strong>{' '}
                  Authorize advertising access separately, then choose your ad
                  accounts and save the selection. Signing in alone does not
                  connect them.
                </li>
                <li>
                  <strong className="font-semibold text-[#161616]">
                    Review reporting in Campaigns.
                  </strong>{' '}
                  Live reporting sync is not available yet. The demo shows
                  sample campaigns and metrics, not your connected account’s
                  results.
                </li>
                <li>
                  <strong className="font-semibold text-[#161616]">
                    Prepare, review and approve a draft.
                  </strong>{' '}
                  Check the objective, budget and creative. Approval is saved
                  locally; publishing is not available, and no ads are changed
                  or money spent.
                </li>
                <li>
                  <strong className="font-semibold text-[#161616]">
                    Use assistant guidance.
                  </strong>{' '}
                  Add your business profile and ask about goals, time periods
                  and budget limits. Responses are a demo walkthrough, not live
                  AI analysis.
                </li>
              </ol>
              {journey.loading ? (
                <output className="flex h-10 items-center justify-center rounded-full bg-[#f2f2f2] px-5 text-[#636363]">
                  {journey.action.short}
                </output>
              ) : (
                <Link
                  {...journey.action.route}
                  onClick={() => setHelp(null)}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#161616] px-5 font-semibold text-white hover:bg-[#2e2e2e]"
                >
                  {journey.action.label}
                </Link>
              )}
            </>
          )}
          <p className="text-[13px] leading-5 text-[#636363]">
            {help === 'preferences'
              ? 'This preference lasts while this workspace page stays open. Shift+Enter always adds a new line.'
              : 'Your business profile, chats and drafts are saved per workspace in this browser. They are not synced to Meta.'}
          </p>
        </DialogContent>
      </Dialog>
      <BusinessContextDialog
        workspaceId={workspaceId}
        open={contextOpen}
        onOpenChange={setContextOpen}
      />
    </AppFrame>
  );
}
