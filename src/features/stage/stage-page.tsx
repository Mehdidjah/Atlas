import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  Check,
  Clipboard,
  Cloud,
  Copy,
  FileSpreadsheet,
  Folder,
  Link2,
  Plus,
  Repeat2,
  Share2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useParams } from '@tanstack/react-router';
import { AppFrame } from '@/src/components/shell/app-frame';
import { demoApi } from '@/src/lib/demo-api';

const stageSchema = z.object({
  folders: z
    .array(
      z.object({
        url: z
          .url('Enter a valid shared folder URL.')
          .refine(
            (value) =>
              /^https:\/\/drive\.google\.com\/drive\/folders\/[^/?#]+/.test(
                value,
              ),
            'Use a Google Drive folder URL.',
          ),
      }),
    )
    .min(1),
});
type StageForm = z.infer<typeof stageSchema>;

const features = [
  {
    icon: FileSpreadsheet,
    title: 'Launch creative tests from a planning sheet',
    body: 'Turn approved spreadsheet rows into structured campaign drafts without rebuilding the setup by hand.',
  },
  {
    icon: Folder,
    title: 'Mirror cloud-drive folder structure',
    body: 'Keep briefs, source files, exports, and delivery status aligned with the way your team already works.',
  },
  {
    icon: Repeat2,
    title: 'Duplicate winning setups and replace creative',
    body: 'Reuse proven campaign structure while Stage swaps only the creative and tracking that changed.',
  },
  {
    icon: Cloud,
    title: 'Work across multiple drives and platforms',
    body: 'Connect the folders and ad destinations each market needs from a single controlled workflow.',
  },
];

function WorkflowIllustration() {
  return (
    <svg
      viewBox="0 0 425 161"
      className="mx-auto h-auto w-full max-w-[425px]"
      aria-label="Creative workflow from planning to launch"
    >
      <path
        d="M82 80h260"
        stroke="#d9d9d9"
        strokeWidth="2"
        strokeDasharray="5 7"
      />
      <g transform="translate(15 44)">
        <rect width="112" height="76" rx="18" fill="#fff" stroke="#e0e0e0" />
        <rect x="16" y="16" width="32" height="32" rx="9" fill="#def4e7" />
        <path d="M25 26h14M25 32h14M25 38h8" stroke="#287a4b" strokeWidth="2" />
        <text x="16" y="64" fontSize="11" fill="#636363">
          Plan
        </text>
      </g>
      <g transform="translate(156 20)">
        <rect width="112" height="118" rx="18" fill="#fff" stroke="#e0e0e0" />
        <rect x="16" y="16" width="80" height="52" rx="12" fill="#eee8ff" />
        <circle cx="56" cy="42" r="13" fill="#734ede" opacity=".75" />
        <rect x="16" y="80" width="68" height="8" rx="4" fill="#f2f2f2" />
        <rect x="16" y="96" width="45" height="6" rx="3" fill="#e8e8e8" />
        <text x="82" y="108" fontSize="11" fill="#636363">
          Build
        </text>
      </g>
      <g transform="translate(298 44)">
        <rect width="112" height="76" rx="18" fill="#fff" stroke="#e0e0e0" />
        <rect x="16" y="16" width="32" height="32" rx="9" fill="#fff0a2" />
        <path
          d="m27 39 11-11m0 0-1 8m1-8-8 1"
          fill="none"
          stroke="#805d00"
          strokeWidth="2"
        />
        <text x="16" y="64" fontSize="11" fill="#636363">
          Launch
        </text>
      </g>
    </svg>
  );
}

function StageLanding({ onStart }: { onStart: () => void }) {
  return (
    <main className="scrollbar-subtle h-full overflow-y-auto px-4">
      <div className="mx-auto flex min-h-full max-w-[692px] flex-col items-center py-16 text-center">
        <WorkflowIllustration />
        <h1 className="mt-8 text-[36px] font-semibold leading-[43px] tracking-[-.02em]">
          Move creative from plan to live, without the busywork.
        </h1>
        <p className="mt-3 max-w-[620px] text-[18px] leading-[23px] text-[#636363]">
          Stage turns approved folders and planning sheets into reviewable
          campaign drafts while preserving your structure.
        </p>
        <button
          onClick={onStart}
          className="mt-6 h-12 rounded-full bg-[#161616] px-5 text-[18px] font-semibold text-white transition-colors hover:bg-[#2e2e2e]"
        >
          Set up Stage
        </button>
        <p className="mt-3 text-[13px] text-[#9e9e9e]">
          Read-only folder access during setup. You approve every launch.
        </p>
        <section
          className="mt-12 w-full max-w-[544px] text-left"
          aria-labelledby="stage-features"
        >
          <h2 id="stage-features" className="sr-only">
            Stage features
          </h2>
          <Accordion
            className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-standard)]"
            defaultValue={['feature-0']}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <AccordionItem
                  key={feature.title}
                  value={`feature-${index}`}
                  className="border-b border-[#f2f2f2] last:border-0"
                >
                  <AccordionTrigger className="min-h-12 items-center rounded-none px-5 py-3 text-[15px] hover:bg-[#f2f2f2] hover:no-underline">
                    <span className="flex items-center gap-3">
                      <Icon className="size-4" />
                      {feature.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-12 pb-4 text-[13px] leading-[18px] text-[#636363]">
                    {feature.body}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>
      </div>
    </main>
  );
}

function StageOnboarding({
  workspaceId,
  onBack,
}: {
  workspaceId: string;
  onBack: () => void;
}) {
  const [verified, setVerified] = useState<Set<number>>(new Set());
  const {
    control,
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<StageForm>({
    resolver: zodResolver(stageSchema),
    defaultValues: { folders: [{ url: '' }] },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'folders',
  });
  const mutation = useMutation({
    mutationFn: (values: StageForm) =>
      demoApi.connectFolders(
        workspaceId,
        values.folders.map((folder) => folder.url),
      ),
    onSuccess: () =>
      toast.success('Stage connected', {
        description: 'Your folders are ready for the first creative workflow.',
      }),
  });
  const serviceAccount = 'stage-access@aster-ops.iam.gserviceaccount.com';
  const verify = async (index: number) => {
    const valid = await trigger(`folders.${index}.url`, { shouldFocus: true });
    if (valid) {
      setVerified((current) => new Set(current).add(index));
      toast.success('Folder verified', {
        description: getValues(`folders.${index}.url`),
      });
    }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(serviceAccount);
    toast.success('Service account copied');
  };
  return (
    <main className="scrollbar-subtle h-full overflow-y-auto px-5">
      <div className="mx-auto w-full max-w-[980px] py-10">
        <button
          onClick={onBack}
          className="text-[13px] font-semibold text-[#636363] hover:text-[#161616]"
        >
          ← Back to Stage
        </button>
        <div className="mt-7 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#161616] text-white">
            <Sparkles className="size-[18px]" />
          </span>
          <span className="text-[20px] font-semibold tracking-[-.01em]">
            ASTER / STAGE
          </span>
        </div>
        <h1 className="mt-6 text-[36px] font-semibold leading-[43px] tracking-[-.02em]">
          Connect your creative folders
        </h1>
        <p className="mt-2 text-[18px] text-[#636363]">
          Two steps to a structured, reviewable creative workflow.
        </p>
        <div className="my-8 h-px bg-[#e8e8e8]" />
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="grid grid-cols-2 gap-7 max-md:grid-cols-1"
        >
          <section className="flex gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#161616] font-semibold text-white">
              1
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-semibold">
                Share folders with Stage
              </h2>
              <p className="mt-2 text-[#636363]">
                Add this read-only service account to the folders Stage should
                monitor.
              </p>
              <button
                type="button"
                onClick={copy}
                aria-label={`Copy Stage service account ${serviceAccount}`}
                className="mt-5 flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl bg-[#e5efff] px-4 text-left transition-colors hover:bg-[#dbe9ff]"
              >
                <Clipboard className="size-4 shrink-0 text-[#295a9f]" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  {serviceAccount}
                </span>
                <Copy className="size-4 shrink-0" />
              </button>
              <div className="mt-4 rounded-2xl bg-[#f8f8f8] p-4 text-[13px] leading-[18px] text-[#636363]">
                <Share2 className="mb-2 size-4 text-[#161616]" />
                In Drive, choose Share, paste the account above, and keep the
                role set to Viewer.
              </div>
            </div>
          </section>
          <section className="flex gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#161616] font-semibold text-white">
              2
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-semibold">
                Add your folder links
              </h2>
              <p className="mt-2 text-[#636363]">
                Verify at least one shared folder before continuing.
              </p>
              <div className="mt-5 grid gap-2">
                {fields.map((field, index) => (
                  <div key={field.id}>
                    <div className="relative">
                      <Link2 className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9e9e9e]" />
                      <input
                        {...register(`folders.${index}.url`)}
                        aria-label={`Folder URL ${index + 1}`}
                        aria-invalid={Boolean(errors.folders?.[index]?.url)}
                        aria-describedby={
                          errors.folders?.[index]?.url
                            ? `folder-error-${index}`
                            : undefined
                        }
                        onInput={() => {
                          setVerified((current) => {
                            const next = new Set(current);
                            next.delete(index);
                            return next;
                          });
                        }}
                        className="h-12 w-full rounded-2xl border border-[#e0e0e0] pl-12 pr-24 outline-none hover:border-[#cccccc] focus:border-[#9e9e9e] aria-invalid:border-[#cd2823] aria-invalid:shadow-[0_0_0_4px_rgba(223,11,11,.1)]"
                        placeholder="https://drive.google.com/drive/folders/…"
                      />
                      <button
                        type="button"
                        onClick={() => void verify(index)}
                        className={`absolute right-2 top-2 h-8 rounded-xl px-3 text-[13px] font-semibold ${verified.has(index) ? 'bg-[#def4e7] text-[#256b43]' : 'bg-[#f2f2f2] hover:bg-[#e8e8e8]'}`}
                      >
                        {verified.has(index) ? (
                          <span className="flex items-center gap-1">
                            <Check className="size-3" />
                            Verified
                          </span>
                        ) : (
                          'Verify'
                        )}
                      </button>
                    </div>
                    {errors.folders?.[index]?.url?.message ? (
                      <p
                        id={`folder-error-${index}`}
                        role="alert"
                        className="mt-1 text-[13px] text-[#cd2823]"
                      >
                        {errors.folders[index]?.url?.message}
                      </p>
                    ) : null}
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          remove(index);
                          setVerified(
                            (current) =>
                              new Set(
                                [...current]
                                  .filter(
                                    (verifiedIndex) => verifiedIndex !== index,
                                  )
                                  .map((verifiedIndex) =>
                                    verifiedIndex > index
                                      ? verifiedIndex - 1
                                      : verifiedIndex,
                                  ),
                              ),
                          );
                        }}
                        className="mt-1 text-[12px] text-[#9e9e9e] hover:text-[#cd2823]"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => append({ url: '' })}
                className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-[#0067ed]"
              >
                <Plus className="size-4" />
                Add another
              </button>
              <button
                type="submit"
                disabled={!verified.size || mutation.isPending}
                className="mt-6 h-12 w-full rounded-full bg-[#161616] text-[18px] font-semibold text-white hover:bg-[#2e2e2e] disabled:cursor-not-allowed disabled:bg-[#e8e8e8] disabled:text-[#9e9e9e]"
              >
                {mutation.isPending ? 'Connecting…' : 'Continue'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

export function StagePage() {
  const { workspaceId } = useParams({ strict: false }) as {
    workspaceId: string;
  };
  const [onboarding, setOnboarding] = useState(false);
  return (
    <AppFrame workspaceId={workspaceId} section="stage">
      {onboarding ? (
        <StageOnboarding
          workspaceId={workspaceId}
          onBack={() => setOnboarding(false)}
        />
      ) : (
        <StageLanding onStart={() => setOnboarding(true)} />
      )}
    </AppFrame>
  );
}
