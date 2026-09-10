import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { queryKeys } from '@/src/lib/query-keys';
import { demoApi } from '@/src/lib/demo-api';

const contextSchema = z.object({
  context: z
    .string()
    .trim()
    .min(30, 'Add at least 30 characters so Aster has enough context.')
    .max(2_000, 'Keep business profile under 2,000 characters.'),
});
type ContextForm = z.infer<typeof contextSchema>;

export function BusinessContextDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.context(workspaceId),
    queryFn: ({ signal }) => demoApi.getBusinessContext(workspaceId, signal),
    enabled: open,
  });
  const { data } = query;
  const loadedFor = useRef<string | null>(null);
  const [learnMore, setLearnMore] = useState(false);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ContextForm>({
    resolver: zodResolver(contextSchema),
    defaultValues: { context: '' },
  });

  useEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current !== workspaceId && data !== undefined) {
      reset({ context: data });
      loadedFor.current = workspaceId;
    }
  }, [open, workspaceId, data, reset]);

  const mutation = useMutation({
    mutationFn: (value: string) =>
      demoApi.saveBusinessContext(workspaceId, value),
    onSuccess: (value) => {
      queryClient.setQueryData(queryKeys.context(workspaceId), value);
      toast.success('Business profile saved');
      onOpenChange(false);
    },
    onError: () => toast.error('Could not save business profile'),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-[704px] max-w-[calc(100vw-32px)] gap-0 overflow-y-auto rounded-3xl p-5 text-[15px] ring-0 sm:max-w-[704px] sm:px-8 data-open:animate-none data-closed:animate-none"
      >
        <DialogClose
          render={
            <button
              type="button"
              aria-label="Close business profile"
              disabled={mutation.isPending}
              className="absolute right-4 top-4 grid h-12 w-14 place-items-center rounded-full bg-[#f2f2f2] transition-colors hover:bg-[#e8e8e8]"
            />
          }
        >
          <X className="size-4" />
        </DialogClose>
        <DialogHeader className="pr-16">
          <DialogTitle className="text-[30px] font-semibold leading-[33px] tracking-[-0.01em]">
            Business profile
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-[540px] text-[15px] leading-[19px] text-[#636363]">
            Give Aster a short brief: what you sell, who you reach, and your
            advertising goals and budget limits.{' '}
            <button
              type="button"
              aria-expanded={learnMore}
              onClick={() => setLearnMore((value) => !value)}
              className="text-[#0067ed] hover:underline"
            >
              Learn more
            </button>
          </DialogDescription>
        </DialogHeader>
        {learnMore ? (
          <p className="mt-3 text-[13px] leading-5 text-[#636363]">
            Include your market, average order value, target cost per purchase
            and spending limits. This profile is shared across this workspace’s
            chats and saved only in this browser, not in Meta. It guides demo
            responses, not live AI analysis. Do not include passwords or private
            customer data.
          </p>
        ) : null}
        {query.isPending ? (
          <output className="mt-6 text-[#636363]">
            Loading business profile…
          </output>
        ) : query.isError ? (
          <div role="alert" className="mt-6 text-[#cd2823]">
            Could not load business profile.{' '}
            <button className="underline" onClick={() => void query.refetch()}>
              Retry
            </button>
          </div>
        ) : (
          <form
            className="mt-6"
            onSubmit={handleSubmit((values) => mutation.mutate(values.context))}
          >
            <label htmlFor="business-context" className="sr-only">
              Business profile
            </label>
            <textarea
              id="business-context"
              {...register('context')}
              disabled={mutation.isPending}
              maxLength={2000}
              aria-describedby="context-error business-profile-storage"
              aria-invalid={Boolean(errors.context)}
              className="h-80 w-full resize-none rounded-2xl border border-[#e0e0e0] p-5 outline-none transition-[border,box-shadow] hover:border-[#cccccc] focus:border-[#9e9e9e] focus:ring-0 aria-invalid:border-[#cd2823] aria-invalid:shadow-[0_0_0_4px_rgba(223,11,11,.1)]"
              placeholder="Example: We sell refillable skincare in France to adults aged 25 to 45. Our goal is online purchases. Average order: €45. Target cost per purchase: under €12. Budget: €40/day. Do not increase spending without review."
            />
            <div className="mt-2 flex min-h-5 items-center justify-between text-[13px] leading-[17px]">
              <span id="context-error" role="alert" className="text-[#cd2823]">
                {errors.context?.message ||
                  (mutation.isError
                    ? 'Could not save profile. Your text is retained; retry when ready.'
                    : '')}
              </span>
              <span id="business-profile-storage" className="text-[#9e9e9e]">
                Saved in this workspace and browser
              </span>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={mutation.isPending || !isDirty}
                className="h-12 rounded-full bg-[#161616] px-6 text-[18px] font-semibold text-white transition-colors hover:bg-[#2e2e2e] disabled:cursor-not-allowed disabled:bg-[#e8e8e8] disabled:text-[#9e9e9e]"
              >
                {mutation.isPending ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
