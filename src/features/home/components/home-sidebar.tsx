import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  BookOpenText,
  Bot,
  CirclePlus,
  House,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/src/lib/query-keys';
import { demoApi } from '@/src/lib/demo-api';

export function HomeSidebar({
  workspaceId,
  onNavigate,
  onEditContext,
}: {
  workspaceId: string;
  onNavigate?: () => void;
  onEditContext?: () => void;
}) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: chats = [] } = useQuery({
    queryKey: queryKeys.chats(workspaceId),
    queryFn: ({ signal }) => demoApi.getChats(workspaceId, signal),
  });
  const filteredChats = useMemo(
    () =>
      chats.filter((chat) =>
        chat.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [chats, search],
  );
  const createChat = useMutation({
    mutationFn: () => demoApi.createChat(workspaceId, 'Untitled analysis'),
    onSuccess: async (chat) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.chats(workspaceId),
      });
      onNavigate?.();
      void navigate({
        to: '/workspaces/$workspaceId/overview/chat/$chatId',
        params: { workspaceId, chatId: chat.id },
      });
    },
  });
  const navClass =
    'flex h-8 w-full items-center gap-2 rounded-2xl px-4 text-[14px] transition-colors hover:bg-[#f2f2f2] focus-visible:outline-offset-[-2px]';

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden p-2">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9e9e9e]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-8 w-full rounded-full border border-transparent bg-[#f2f2f2] px-8 text-[14px] outline-none transition-colors placeholder:text-[#9e9e9e] hover:bg-[#e8e8e8] focus:border-[#9e9e9e] focus:bg-white"
          placeholder="Search"
          aria-label="Search chats"
        />
      </label>
      <nav className="mt-2 grid gap-0.5" aria-label="Home workspace">
        <Link
          to="/workspaces/$workspaceId/overview"
          params={{ workspaceId }}
          activeProps={{ className: 'bg-[#f2f2f2] font-medium' }}
          className={navClass}
          onClick={onNavigate}
        >
          <House className="size-4" />
          Overview
        </Link>
        <button className={navClass} onClick={onEditContext}>
          <BookOpenText className="size-4" />
          Business context
        </button>
        <button
          className={navClass}
          onClick={() =>
            toast('Meta Ads MCP demo', {
              description:
                'Connect a production Meta app in the backend to enable account actions.',
            })
          }
        >
          <Bot className="size-4" />
          Meta Ads MCP{' '}
          <span className="ml-auto rounded-full bg-[#e5efff] px-2 py-0.5 text-[11px] font-semibold text-[#295a9f]">
            Beta
          </span>
        </button>
      </nav>
      <div className="mb-2 mt-4 px-4 text-[12px] font-semibold leading-[15px] tracking-[.02em] text-[#636363]">
        Chats
      </div>
      <button
        type="button"
        onClick={() => createChat.mutate()}
        className={navClass}
        disabled={createChat.isPending}
      >
        <CirclePlus className="size-4" />
        {createChat.isPending ? 'Creating…' : 'New chat'}
      </button>
      <div className="scrollbar-subtle mt-1 min-h-0 flex-1 overflow-y-auto">
        {filteredChats.map((chat) => (
          <Link
            key={chat.id}
            to="/workspaces/$workspaceId/overview/chat/$chatId"
            params={{ workspaceId, chatId: chat.id }}
            activeProps={{ className: 'bg-[#f2f2f2] font-medium' }}
            className={`${navClass} justify-between`}
            onClick={onNavigate}
          >
            <span className="truncate">{chat.title}</span>
            <span className="sr-only">Updated {chat.updatedAt}</span>
          </Link>
        ))}
        {!filteredChats.length ? (
          <p className="px-4 py-3 text-[13px] text-[#9e9e9e]">
            No chats match “{search}”.
          </p>
        ) : null}
      </div>
      <button
        className={`${navClass} mt-2 text-[#636363]`}
        onClick={() => toast.success('Chat preferences saved for this demo')}
      >
        <SlidersHorizontal className="size-4" />
        Chat preferences
      </button>
    </aside>
  );
}
