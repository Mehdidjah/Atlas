import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, Send } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { demoApi } from '@/src/lib/demo-api';
import { queryKeys } from '@/src/lib/query-keys';
import { AppTooltip } from '@/src/components/feedback/app-tooltip';
import type { Suggestion } from '@/src/lib/types';

export function AiComposer({
  workspaceId,
  onEditContext,
}: {
  workspaceId: string;
  onEditContext: () => void;
}) {
  const [value, setValue] = useState('');
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [tab, setTab] = useState<'suggested' | 'meta'>('suggested');
  const [answer, setAnswer] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: suggestions = [] } = useQuery({
    queryKey: queryKeys.suggestions(workspaceId),
    queryFn: ({ signal }) => demoApi.getSuggestions(workspaceId, signal),
  });
  const send = useMutation({
    mutationFn: (prompt: string) => demoApi.sendMessage(prompt),
    onSuccess: (response) => setAnswer(response.answer),
  });

  const resize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '50px';
    textarea.style.height = `${Math.min(150, textarea.scrollHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 150 ? 'auto' : 'hidden';
  };
  useEffect(resize, [value]);

  const submit = () => {
    const prompt = value.trim();
    if (!prompt || send.isPending) return;
    setAnswer('');
    send.mutate(prompt);
    setValue('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const chooseSuggestion = (suggestion: Suggestion) => {
    setValue(suggestion.prompt);
    setPreviewPrompt('');
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const visible = suggestions.filter(
    (suggestion) => suggestion.category === tab,
  );

  return (
    <div className="mx-auto w-full max-w-[712px]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mx-auto w-[calc(100%-32px)] overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-standard)] transition-shadow focus-within:shadow-[var(--shadow-strong)] max-sm:w-full"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={value ? '' : previewPrompt || 'Ask Aster AI'}
          aria-label="Ask Aster AI"
          className="block h-[50px] max-h-[150px] min-h-[50px] w-full resize-none border-0 bg-transparent px-5 pt-3 text-[15px] outline-none placeholder:text-[#9e9e9e]"
        />
        <div className="flex h-12 items-center justify-between px-2 pb-2">
          <AppTooltip label="Edit business context" side="bottom">
            <button
              type="button"
              aria-label="Edit business context"
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
      <div className="mt-8" role="tabpanel">
        <div
          className="flex h-8 gap-1"
          role="tablist"
          aria-label="Prompt suggestions"
        >
          <button
            role="tab"
            aria-selected={tab === 'suggested'}
            onClick={() => setTab('suggested')}
            className={`rounded-full px-3 font-[550] transition-colors ${tab === 'suggested' ? 'bg-[#f2f2f2] text-[#161616]' : 'text-[#636363] hover:text-[#161616]'}`}
          >
            Suggested
          </button>
          <button
            role="tab"
            aria-selected={tab === 'meta'}
            onClick={() => setTab('meta')}
            className={`rounded-full px-3 font-[550] transition-colors ${tab === 'meta' ? 'bg-[#f2f2f2] text-[#161616]' : 'text-[#636363] hover:text-[#161616]'}`}
          >
            Meta Ads MCP
          </button>
        </div>
        <div className="mt-2 grid">
          {visible.map((suggestion) => (
            <button
              key={suggestion.id}
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
        </div>
      </div>
      {send.isPending ? (
        <div
          className="mt-6 rounded-2xl bg-[#f8f8f8] p-4 text-[#636363]"
          aria-live="polite"
        >
          Aster is reviewing your connected demo accounts…
        </div>
      ) : null}
      {answer ? (
        <div className="mt-6 rounded-2xl border border-[#e8e8e8] p-5 leading-6">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-[#161616] text-white">
              <BrainCircuit className="size-4" />
            </span>
            Aster analysis
          </div>
          <p className="text-[#4f4f4f]">{answer}</p>
          <div className="mt-4 text-[12px] font-semibold uppercase tracking-[.08em] text-[#9e9e9e]">
            Demo response · No changes made
          </div>
        </div>
      ) : null}
    </div>
  );
}
