import { useEffect } from 'react';
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
    .max(2_000, 'Keep business context under 2,000 characters.'),
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
  const { data } = useQuery({
    queryKey: queryKeys.context(workspaceId),
    queryFn: ({ signal }) => demoApi.getBusinessContext(workspaceId, signal),
    enabled: open,
  });
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
    if (data) reset({ context: data });
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (value: string) =>
      demoApi.saveBusinessContext(workspaceId, value),
    onSuccess: (value) => {
      queryClient.setQueryData(queryKeys.context(workspaceId), value);
      toast.success('Business context saved');
      onOpenChange(false);
    },
    onError: () => toast.error('Could not save business context'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-[704px] max-w-[calc(100vw-32px)] gap-0 overflow-y-auto rounded-3xl p-5 text-[15px] ring-0 sm:max-w-[704px] sm:px-8 data-open:animate-none data-closed:animate-none"
      >
        <DialogClose
          render={
            <button
              type="button"
              aria-label="Close business context"
              className="absolute right-4 top-4 grid h-12 w-14 place-items-center rounded-full bg-[#f2f2f2] transition-colors hover:bg-[#e8e8e8]"
            />
          }
        >
          <X className="size-4" />
        </DialogClose>
        <DialogHeader className="pr-16">
          <DialogTitle className="text-[30px] font-semibold leading-[33px] tracking-[-0.01em]">
            Business context
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-[540px] text-[15px] leading-[19px] text-[#636363]">
            Tell Aster what matters to your business so analysis and
            recommendations use the right constraints.{' '}
            <a
              href="https://example.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#0067ed] hover:underline"
            >
              Learn more
            </a>
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-6"
          onSubmit={handleSubmit((values) => mutation.mutate(values.context))}
        >
          <label htmlFor="business-context" className="sr-only">
            Business context
          </label>
          <textarea
            id="business-context"
            {...register('context')}
            aria-invalid={Boolean(errors.context)}
            className="h-80 w-full resize-none rounded-2xl border border-[#e0e0e0] p-5 outline-none transition-[border,box-shadow] hover:border-[#cccccc] focus:border-[#9e9e9e] focus:ring-0 aria-invalid:border-[#cd2823] aria-invalid:shadow-[0_0_0_4px_rgba(223,11,11,.1)]"
            placeholder="Describe your products, markets, unit economics, targets, and guardrails…"
          />
          <div className="mt-2 flex min-h-5 items-center justify-between text-[13px] leading-[17px]">
            <span role="alert" className="text-[#cd2823]">
              {errors.context?.message}
            </span>
            <span className="text-[#9e9e9e]">
              Saved only in this browser demo
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={mutation.isPending || !isDirty}
              className="h-12 rounded-full bg-[#161616] px-6 text-[18px] font-semibold text-white transition-colors hover:bg-[#2e2e2e] disabled:cursor-not-allowed disabled:bg-[#e8e8e8] disabled:text-[#9e9e9e]"
            >
              {mutation.isPending ? 'Saving…' : 'Save context'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
