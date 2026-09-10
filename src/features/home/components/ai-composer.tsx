import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { BrainCircuit, Send } from 'lucide-react';
import { AppTooltip } from '@/src/components/feedback/app-tooltip';
import type { Suggestion } from '@/src/lib/types';
import { demoApi } from '@/src/lib/demo-api';
import { queryKeys } from '@/src/lib/query-keys';
import { useWorkspaceJourney } from '@/src/features/connections/use-workspace-journey';
import {
  assistantMessageAction,
  groundedReply,
  readMessages,
  saveMessages,
  type ConversationMessage,
} from '../conversation-store';
import { useHomeFilters } from '../home-filters';

export function AiComposer({
  workspaceId,
  chatId,
  title,
  onEditContext,
  onPendingChange,
  enterToSend = true,
  promptRequest,
  onPromptConsumed,
}: {
  workspaceId: string;
  chatId?: string;
  title?: string;
  onEditContext: () => void;
  onPendingChange?: (pending: boolean) => void;
  enterToSend?: boolean;
  promptRequest?: { prompt: string; id: number };
  onPromptConsumed?: () => void;
}) {
  const [initial] = useState(() => readMessages(workspaceId, chatId));
  const [messages, setMessages] = useState(initial.messages);
  const [storageError, setStorageError] = useState(initial.error);
  const [value, setValue] = useState('');
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [tab, setTab] = useState<'suggested' | 'meta'>('suggested');
  const tabsId = useId();
  const tabRefs = useRef<
    Record<'suggested' | 'meta', HTMLButtonElement | null>
  >({ suggested: null, meta: null });
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.suggestions(workspaceId),
    queryFn: ({ signal }) => demoApi.getSuggestions(workspaceId, signal),
  });
  const [activeChat, setActiveChat] = useState(chatId);
  const [status, setStatus] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const latestMessages = useRef(messages);
  const sendLock = useRef(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const filters = useHomeFilters();
  const journey = useWorkspaceJourney(workspaceId);
  const planning = {
    ...journey,
    dataWorkspaceId: workspaceId,
    sampleFilters: filters,
  };
  const messageAction = assistantMessageAction(messages, planning);
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard(workspaceId, filters),
    queryFn: ({ signal }) => demoApi.getDashboard(filters, signal, workspaceId),
  });
  const context = useQuery({
    queryKey: queryKeys.context(workspaceId),
    queryFn: ({ signal }) => demoApi.getBusinessContext(workspaceId, signal),
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onPendingChange?.(false);
    };
  }, [onPendingChange]);
  useEffect(() => {
    if (messages.length || status)
      end.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }, [messages, status]);
  const retain = (id: string, items: ConversationMessage[]) => {
    latestMessages.current = items;
    const error = saveMessages(workspaceId, id, items);
    if (mounted.current) {
      setMessages(items);
      setStorageError(error);
    }
    return error;
  };
  const send = useMutation({
    mutationFn: async ({
      prompt,
      retryId,
    }: {
      prompt: string;
      retryId?: string;
    }) => {
      let id = activeChat;
      if (!id) {
        const created = await demoApi.createChat(
          workspaceId,
          prompt.length > 48 ? `${prompt.slice(0, 48)}…` : prompt,
        );
        id = created.id;
        if (mounted.current) setActiveChat(id);
        void client.invalidateQueries({
          queryKey: queryKeys.chats(workspaceId),
        });
      }
      const user: ConversationMessage = {
        id: retryId ?? crypto.randomUUID(),
        role: 'user',
        content: prompt,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      const pendingMessages = retryId
        ? latestMessages.current.map((message) =>
            message.id === retryId ? user : message,
          )
        : [...latestMessages.current, user];
      retain(id, pendingMessages);
      try {
        // Reuse the demo transport for pending/error behavior, not its canned live-review claim.
        await demoApi.sendMessage(prompt);
        const answer: ConversationMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: groundedReply(
            prompt,
            dashboard.data,
            context.data ?? '',
            planning,
          ),
          replyToId: user.id,
          createdAt: new Date().toISOString(),
          status: 'sent',
        };
        const error = retain(id, [
          ...pendingMessages.map((message) =>
            message.id === user.id
              ? { ...message, status: 'sent' as const }
              : message,
          ),
          answer,
        ]);
        return { id, persisted: !error };
      } catch (error) {
        retain(
          id,
          pendingMessages.map((message) =>
            message.id === user.id
              ? { ...message, status: 'failed' as const }
              : message,
          ),
        );
        throw error;
      }
    },
    onMutate: () => {
      onPendingChange?.(true);
      setStatus('Preparing demo guidance…');
    },
    onSuccess: (result) => {
      if (!mounted.current) return;
      setValue('');
      setStatus('Demo response ready. No live actions were taken.');
      if (!chatId && result.persisted)
        void navigate({
          to: '/workspaces/$workspaceId/overview/chat/$chatId',
          params: { workspaceId, chatId: result.id },
          replace: true,
        });
      requestAnimationFrame(() => textarea.current?.focus());
    },
    onError: () => {
      if (mounted.current) {
        setStatus(
          'Message could not be completed. Your text has been retained.',
        );
        textarea.current?.focus();
      }
    },
    onSettled: () => {
      sendLock.current = false;
      if (mounted.current) onPendingChange?.(false);
    },
  });
  const submit = (prompt = value.trim(), retryId?: string) => {
    if (!prompt || sendLock.current) return;
    sendLock.current = true;
    // Re-send the retained failed message instead of appending a duplicate.
    const last = latestMessages.current.at(-1);
    send.mutate({
      prompt,
      retryId:
        retryId ??
        (last?.role === 'user' &&
        last.status === 'failed' &&
        last.content === prompt
          ? last.id
          : undefined),
    });
  };
  useEffect(() => {
    const field = textarea.current;
    if (!field) return;
    field.style.height = '50px';
    field.style.height = `${Math.min(150, field.scrollHeight)}px`;
    field.style.overflowY = field.scrollHeight > 150 ? 'auto' : 'hidden';
  }, [value]);
  useEffect(() => {
    if (!promptRequest) return;
    const frame = requestAnimationFrame(() => {
      setValue(promptRequest.prompt);
      setPreviewPrompt('');
      textarea.current?.focus();
      onPromptConsumed?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [promptRequest, onPromptConsumed]);
  const chooseSuggestion = (suggestion: Suggestion) => {
    setValue(suggestion.prompt);
    setPreviewPrompt('');
    requestAnimationFrame(() => textarea.current?.focus());
  };
  const visible = (suggestionsQuery.data ?? []).filter(
    (suggestion) => suggestion.category === tab,
  );
  return (
    <div className="mx-auto w-full max-w-[712px]">
      {storageError ? (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-[#e8e8e8] p-4 text-[13px] text-[#b36b00]"
        >
          {storageError}
        </p>
      ) : null}
      {messages.length ? (
        <section aria-label={title ?? 'Conversation'} className="mb-6">
          <ol aria-label="Messages" className="grid gap-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className={message.role === 'user' ? 'ml-8' : 'mr-4'}
              >
                <article
                  className={`rounded-2xl p-5 leading-6 ${message.role === 'user' ? 'bg-[#f8f8f8]' : 'border border-[#e8e8e8]'}`}
                >
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    {message.role === 'assistant' ? (
                      <span className="grid size-7 place-items-center rounded-lg bg-[#161616] text-white">
                        <BrainCircuit className="size-4" />
                      </span>
                    ) : null}
                    {message.role === 'user' ? 'You' : 'Aster analysis'}
                    <time
                      className="ml-auto text-[12px] font-normal text-[#9e9e9e]"
                      dateTime={message.createdAt}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[#4f4f4f]">
                    {message.content}
                  </p>
                  {message.role === 'assistant' ? (
                    <div className="mt-4 text-[12px] font-semibold uppercase tracking-[.08em] text-[#9e9e9e]">
                      Demo response · No changes made
                    </div>
                  ) : null}
                  {message.status === 'failed' ? (
                    <div className="mt-3 text-[13px] text-[#cd2823]">
                      <p>Response interrupted. Your message is retained.</p>
                      <button
                        className="mt-2 h-8 rounded-full bg-[#f2f2f2] px-3 font-medium text-[#161616] hover:bg-[#e8e8e8] disabled:opacity-50"
                        disabled={send.isPending}
                        onClick={() => submit(message.content, message.id)}
                      >
                        Retry this message
                      </button>
                    </div>
                  ) : null}
                </article>
              </li>
            ))}
          </ol>
          {!send.isPending && !send.isError && messageAction?.route ? (
            <Link
              {...messageAction.route}
              className="mt-4 inline-flex h-8 items-center rounded-full bg-[#f2f2f2] px-3 font-medium hover:bg-[#e8e8e8]"
            >
              {messageAction.label} →
            </Link>
          ) : null}
          <div ref={end} />
        </section>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mx-auto w-[calc(100%-32px)] overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-standard)] transition-shadow focus-within:shadow-[var(--shadow-strong)] max-sm:w-full"
      >
        <textarea
          ref={textarea}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              enterToSend &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
          disabled={send.isPending}
          maxLength={4000}
          placeholder={
            value ? '' : previewPrompt || 'Ask Aster AI · Demo guidance'
          }
          aria-label="Ask Aster AI"
          className="block h-[50px] max-h-[150px] min-h-[50px] w-full resize-none border-0 bg-transparent px-5 pt-3 text-[15px] outline-none placeholder:text-[#9e9e9e]"
        />
        <div className="flex h-12 items-center justify-between px-2 pb-2">
          <AppTooltip label="Edit business profile" side="bottom">
            <button
              type="button"
              aria-label="Edit business profile"
              className="grid size-8 place-items-center rounded-full text-[#636363] transition-colors hover:bg-[#e8e8e8] hover:text-[#161616]"
              onClick={onEditContext}
            >
              <BrainCircuit className="size-4" />
            </button>
          </AppTooltip>
          <button
            type="submit"
            aria-label="Send message"
            disabled={!value.trim() || send.isPending}
            className="grid size-8 place-items-center rounded-full bg-[#161616] text-[#f8f8f8] transition-colors hover:bg-[#2e2e2e] disabled:cursor-not-allowed disabled:bg-[#e8e8e8] disabled:text-[#9e9e9e]"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
      <div className="mt-8">
        <div
          className="flex h-8 gap-1"
          role="tablist"
          tabIndex={-1}
          aria-label="Prompt suggestions"
          aria-orientation="horizontal"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 'suggested'
                : event.key === 'End'
                  ? 'meta'
                  : tab === 'suggested'
                    ? 'meta'
                    : 'suggested';
            setTab(next);
            setPreviewPrompt('');
            tabRefs.current[next]?.focus();
          }}
        >
          <button
            type="button"
            role="tab"
            id={`${tabsId}-suggested-tab`}
            aria-controls={`${tabsId}-suggested-panel`}
            ref={(element) => {
              tabRefs.current.suggested = element;
            }}
            tabIndex={tab === 'suggested' ? 0 : -1}
            aria-selected={tab === 'suggested'}
            onClick={() => {
              setTab('suggested');
              setPreviewPrompt('');
            }}
            className={`rounded-full px-3 font-[550] transition-colors ${tab === 'suggested' ? 'bg-[#f2f2f2] text-[#161616]' : 'text-[#636363] hover:text-[#161616]'}`}
          >
            Campaign guidance
          </button>
          <button
            type="button"
            role="tab"
            id={`${tabsId}-meta-tab`}
            aria-controls={`${tabsId}-meta-panel`}
            ref={(element) => {
              tabRefs.current.meta = element;
            }}
            tabIndex={tab === 'meta' ? 0 : -1}
            aria-selected={tab === 'meta'}
            onClick={() => {
              setTab('meta');
              setPreviewPrompt('');
            }}
            className={`rounded-full px-3 font-[550] transition-colors ${tab === 'meta' ? 'bg-[#f2f2f2] text-[#161616]' : 'text-[#636363] hover:text-[#161616]'}`}
          >
            Account setup
          </button>
        </div>
        {(['suggested', 'meta'] as const).map((category) => (
          <div
            key={category}
            role="tabpanel"
            id={`${tabsId}-${category}-panel`}
            aria-labelledby={`${tabsId}-${category}-tab`}
            hidden={tab !== category}
            className={tab === category ? 'mt-2 grid' : 'hidden'}
          >
            {tab === category ? (
              <>
                {suggestionsQuery.isPending ? (
                  <output className="px-3 py-2 text-[#9e9e9e]">
                    Loading suggestions…
                  </output>
                ) : null}
                {suggestionsQuery.isError ? (
                  <p
                    role="alert"
                    className="px-3 py-2 text-[13px] text-[#cd2823]"
                  >
                    Could not load suggestions.{' '}
                    <button
                      className="underline"
                      onClick={() => void suggestionsQuery.refetch()}
                    >
                      Retry
                    </button>
                  </p>
                ) : null}
                {visible.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    disabled={send.isPending}
                    type="button"
                    className="group flex min-h-9 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-[#636363] transition-colors hover:bg-[#f8f8f8] hover:text-[#161616] focus:bg-[#f8f8f8] focus:text-[#161616]"
                    onMouseEnter={() => {
                      if (!value) setPreviewPrompt(suggestion.prompt);
                    }}
                    onMouseLeave={() => setPreviewPrompt('')}
                    onFocus={() => {
                      if (!value) setPreviewPrompt(suggestion.prompt);
                    }}
                    onBlur={() => setPreviewPrompt('')}
                    onClick={() => chooseSuggestion(suggestion)}
                  >
                    <span className="grid size-5 place-items-center rounded-md bg-[#f2f2f2] text-[#734ede]">
                      <BrainCircuit className="size-3.5" />
                    </span>
                    <span>{suggestion.label}</span>
                    <span className="ml-auto text-[#9e9e9e] opacity-0 transition-opacity group-hover:opacity-100">
                      Use prompt
                    </span>
                  </button>
                ))}
              </>
            ) : null}
          </div>
        ))}
      </div>
      <div
        aria-live="polite"
        aria-atomic="true"
        className={status ? 'mt-4 text-[12px] text-[#9e9e9e]' : 'sr-only'}
      >
        {status ||
          (dashboard.isPending
            ? 'Loading sample metrics…'
            : 'Demo assistant · No live actions')}
      </div>
      {dashboard.isError ? (
        <p role="alert" className="mt-3 text-[13px] text-[#cd2823]">
          Sample metrics could not load. Setup and planning help still work; I
          cannot assess missing performance data. Your text is retained.{' '}
          <button
            className="underline"
            onClick={() => void dashboard.refetch()}
          >
            Retry metrics
          </button>
        </p>
      ) : null}
      {context.isError ? (
        <p className="mt-3 text-[13px] text-[#b36b00]">
          Business profile is unavailable. You can still ask about account setup
          or plan a campaign without it.{' '}
          <button className="underline" onClick={() => void context.refetch()}>
            Retry business profile
          </button>
        </p>
      ) : null}
      {send.isError ? (
        <p role="alert" className="mt-3 text-[13px] text-[#cd2823]">
          Could not complete the message. Your text is retained. Retry when
          ready; no live action was taken.
        </p>
      ) : null}
      {send.isPending ? (
        <output className="mt-6 block rounded-2xl bg-[#f8f8f8] p-4 text-[#636363]">
          Preparing demo guidance…
        </output>
      ) : null}
    </div>
  );
}
