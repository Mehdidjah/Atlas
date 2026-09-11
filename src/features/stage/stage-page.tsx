import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  Check,
  Cloud,
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

const MAX_REFERENCES = 50;
const MAX_URL_LENGTH = 2048;
const MAX_DISPLAY_NAME_LENGTH = 80;

interface FolderReference {
  url: string;
  displayName?: string;
  folderId: string;
}

interface StoredReferencesResult {
  references: FolderReference[];
  issue: string | null;
}

const storedReferenceSchema = z.union([
  z.string().max(MAX_URL_LENGTH),
  z.object({
    url: z.string().max(MAX_URL_LENGTH),
    displayName: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
    // Keep object entries written by earlier browser-only builds readable.
    name: z.string().max(MAX_DISPLAY_NAME_LENGTH).optional(),
  }),
]);

function parseDriveFolderUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'drive.google.com' ||
      parsed.port ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }

    const match = parsed.pathname.match(
      /^\/drive(?:\/u\/\d+)?\/folders\/([A-Za-z0-9_-]{1,256})\/?$/,
    );
    if (!match) return null;

    parsed.hash = '';
    return { folderId: match[1], url: parsed.toString() };
  } catch {
    return null;
  }
}

const folderUrlSchema = z
  .string()
  .trim()
  .min(1, 'Enter a Google Drive folder URL.')
  .max(MAX_URL_LENGTH, `Use a URL under ${MAX_URL_LENGTH} characters.`)
  .refine(
    (value) => parseDriveFolderUrl(value) !== null,
    'Use a drive.google.com folder URL, such as /drive/folders/ID or /drive/u/0/folders/ID.',
  );

const stageSchema = z
  .object({
    folders: z
      .array(z.object({ url: folderUrlSchema }))
      .min(1)
      .max(
        MAX_REFERENCES,
        `Save no more than ${MAX_REFERENCES} folder references.`,
      ),
  })
  .superRefine((values, context) => {
    const folderIds = new Set<string>();

    values.folders.forEach((folder, index) => {
      const parsed = parseDriveFolderUrl(folder.url);
      if (!parsed) return;

      if (folderIds.has(parsed.folderId)) {
        context.addIssue({
          code: 'custom',
          path: ['folders', index, 'url'],
          message: 'This Google Drive folder reference is already added.',
        });
        return;
      }

      folderIds.add(parsed.folderId);
    });
  });

type StageForm = z.infer<typeof stageSchema>;

function storageKey(workspaceId: string) {
  return `aster-stage-${workspaceId}`;
}

function readStoredReferences(workspaceId: string): StoredReferencesResult {
  if (typeof window === 'undefined') {
    return { references: [], issue: null };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(workspaceId));
    if (raw === null) return { references: [], issue: null };

    const decoded: unknown = JSON.parse(raw);
    if (!Array.isArray(decoded)) {
      return {
        references: [],
        issue:
          'Saved folder references use an unsupported browser-data format. No changes were made.',
      };
    }

    const references: FolderReference[] = [];
    const folderIds = new Set<string>();
    let skipped = 0;

    for (const value of decoded) {
      if (references.length >= MAX_REFERENCES) {
        skipped += 1;
        continue;
      }

      const stored = storedReferenceSchema.safeParse(value);
      if (!stored.success) {
        skipped += 1;
        continue;
      }

      const url =
        typeof stored.data === 'string' ? stored.data : stored.data.url;
      const displayName =
        typeof stored.data === 'string'
          ? undefined
          : (stored.data.displayName ?? stored.data.name)?.trim() || undefined;
      const parsedUrl = parseDriveFolderUrl(url);

      if (!parsedUrl || folderIds.has(parsedUrl.folderId)) {
        skipped += 1;
        continue;
      }

      folderIds.add(parsedUrl.folderId);
      references.push({ ...parsedUrl, displayName });
    }

    return {
      references,
      issue: skipped
        ? `${skipped} invalid or duplicate saved ${skipped === 1 ? 'entry was' : 'entries were'} skipped.`
        : null,
    };
  } catch {
    return {
      references: [],
      issue:
        'Saved folder references could not be read. Browser storage may be blocked or contain invalid data. No changes were made.',
    };
  }
}

function writeStoredReferences(
  workspaceId: string,
  references: FolderReference[],
): string | null {
  if (typeof window === 'undefined') {
    return 'Folder references are only available in a browser.';
  }

  try {
    // Keep unnamed entries as strings so the original string[] format remains readable.
    const stored = references.map((reference) =>
      reference.displayName
        ? { url: reference.url, displayName: reference.displayName }
        : reference.url,
    );
    window.localStorage.setItem(
      storageKey(workspaceId),
      JSON.stringify(stored),
    );
    return null;
  } catch {
    return 'The folder references could not be saved. Check browser storage permissions or available space and try again.';
  }
}

const features = [
  {
    icon: FileSpreadsheet,
    title: 'Save creative folder references for a workspace',
    body: 'Keep optional Google Drive folder URLs beside your planning workflow without rebuilding a shortcut list each time.',
  },
  {
    icon: Folder,
    title: 'Review the folder links you saved',
    body: 'Return to saved references in Creatives without granting access to files, metadata, or sharing settings.',
  },
  {
    icon: Repeat2,
    title: 'Update references as your workflow changes',
    body: 'Add or remove shortcuts at any time. Aster checks URL format locally and never verifies folder contents or permissions.',
  },
  {
    icon: Cloud,
    title: 'Keep the workflow optional and workspace-scoped',
    body: 'References stay in this browser for this workspace. They do not connect Drive, build campaigns, or publish ads.',
  },
];

function WorkflowIllustration() {
  return (
    <svg
      viewBox="0 0 425 161"
      className="mx-auto h-auto w-full max-w-[425px]"
      aria-label="Creative planning reference workflow"
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
          Review
        </text>
      </g>
    </svg>
  );
}

function StageLanding({
  onStart,
  savedCount,
  storageIssue,
}: {
  onStart: () => void;
  savedCount: number;
  storageIssue: string | null;
}) {
  const savedReferenceLabel = `${savedCount} folder ${savedCount === 1 ? 'reference' : 'references'}`;

  return (
    <main className="scrollbar-subtle h-full overflow-y-auto px-4">
      <div className="mx-auto flex min-h-full max-w-[692px] flex-col items-center py-16 text-center">
        <WorkflowIllustration />
        <h1 className="mt-8 text-[36px] font-semibold leading-[43px] tracking-[-.02em]">
          Keep creative references organized, without the busywork.
        </h1>
        <p className="mt-3 max-w-[620px] text-[18px] leading-[23px] text-[#636363]">
          Keep optional Google Drive folder shortcuts alongside your campaign
          planning. This step is not required to connect Meta or prepare a
          campaign.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-6 h-12 rounded-full bg-[#161616] px-5 text-[18px] font-semibold text-white transition-colors hover:bg-[#2e2e2e]"
        >
          {savedCount ? 'Review saved references' : 'Add folder references'}
        </button>
        <p
          role={storageIssue ? 'alert' : undefined}
          className="mt-3 text-[13px] text-[#9e9e9e]"
        >
          {storageIssue ??
            (savedCount
              ? `${savedReferenceLabel} saved in this browser. Aster has no Drive access.`
              : 'Save folder references in this browser only. No Drive access or publishing.')}
        </p>
        <section
          className="mt-12 w-full max-w-[544px] text-left"
          aria-labelledby="stage-features"
        >
          <h2 id="stage-features" className="sr-only">
            Creative reference features
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
  storedState,
  onBack,
  onSaved,
}: {
  workspaceId: string;
  storedState: StoredReferencesResult;
  onBack: () => void;
  onSaved: (result: StoredReferencesResult) => void;
}) {
  const [formatChecked, setFormatChecked] = useState<Set<number>>(
    () => new Set(storedState.references.map((_, index) => index)),
  );
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [storageError, setStorageError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<StageForm>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      folders: storedState.references.length
        ? storedState.references.map((reference) => ({ url: reference.url }))
        : [{ url: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'folders',
  });

  const checkFormat = async (index: number) => {
    const valid = await trigger(`folders.${index}.url`, { shouldFocus: true });
    if (!valid) return;

    setFormatChecked((current) => new Set(current).add(index));
    toast.success('Folder URL format looks valid', {
      description:
        'This was a local format check. Aster did not access Google Drive.',
    });
  };

  const saveReferences = (values: StageForm) => {
    const references: FolderReference[] = [];

    for (const folder of values.folders) {
      const parsed = parseDriveFolderUrl(folder.url);
      if (!parsed) {
        setSaveState('idle');
        setStorageError(
          'A folder URL changed before it could be saved. Check its format and try again.',
        );
        return;
      }

      const existing = storedState.references.find(
        (reference) => reference.folderId === parsed.folderId,
      );
      references.push({ ...parsed, displayName: existing?.displayName });
    }

    const error = writeStoredReferences(workspaceId, references);

    if (error) {
      setSaveState('idle');
      setStorageError(error);
      return;
    }

    setStorageError(null);
    setSaveState('saved');
    setFormatChecked(new Set(references.map((_, index) => index)));
    onSaved({ references, issue: null });
    toast.success('Folder references saved', {
      description:
        'Saved in this browser only. Aster did not access Google Drive.',
    });
  };

  const markChanged = (index: number) => {
    setSaveState('idle');
    setStorageError(null);
    setFormatChecked((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
  };

  return (
    <main className="scrollbar-subtle h-full overflow-y-auto px-5">
      <div className="mx-auto w-full max-w-[980px] py-10">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] font-semibold text-[#636363] hover:text-[#161616]"
        >
          ← Back to Creatives
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
          Save your creative folder references
        </h1>
        <p className="mt-2 text-[18px] text-[#636363]">
          Two steps to optional, browser-local shortcuts you can review later.
        </p>
        <div className="my-8 h-px bg-[#e8e8e8]" />
        <form
          noValidate
          onSubmit={handleSubmit(saveReferences)}
          className="grid grid-cols-2 gap-7 max-md:grid-cols-1"
        >
          <section className="flex gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#161616] font-semibold text-white">
              1
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-semibold">
                Save references, not access
              </h2>
              <p className="mt-2 text-[#636363]">
                Aster keeps folder URLs in this browser for this workspace. It
                does not connect to or read Google Drive.
              </p>
              <div className="mt-5 flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl bg-[#e5efff] px-4 text-left">
                <Folder className="size-4 shrink-0 text-[#295a9f]" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                  Folder references only
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-[#295a9f]">
                  No Drive access
                </span>
              </div>
              <div className="mt-4 rounded-2xl bg-[#f8f8f8] p-4 text-[13px] leading-[18px] text-[#636363]">
                <Share2 className="mb-2 size-4 text-[#161616]" />
                You do not need to share folders or change Drive permissions.
                Saving a link does not grant access, verify permissions, or
                import files.
                {storedState.issue ? (
                  <p role="alert" className="mt-3 text-[#cd2823]">
                    {storedState.issue}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
          <section className="flex gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#161616] font-semibold text-white">
              2
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-semibold">
                Save your folder links
              </h2>
              <p className="mt-2 text-[#636363]">
                {storedState.references.length
                  ? 'Review or update the references saved in this browser.'
                  : 'Add at least one link. Aster checks URL format locally only.'}
              </p>
              <div className="mt-5 grid gap-2">
                {fields.map((field, index) => (
                  <div key={field.id}>
                    <div className="relative">
                      <Link2 className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9e9e9e]" />
                      <input
                        {...register(`folders.${index}.url`)}
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        aria-label={`Folder URL ${index + 1}`}
                        aria-invalid={Boolean(errors.folders?.[index]?.url)}
                        aria-describedby={
                          errors.folders?.[index]?.url
                            ? `folder-error-${index}`
                            : undefined
                        }
                        onInput={() => markChanged(index)}
                        className="h-12 w-full rounded-2xl border border-[#e0e0e0] pl-12 pr-28 outline-none hover:border-[#cccccc] focus:border-[#9e9e9e] aria-invalid:border-[#cd2823] aria-invalid:shadow-[0_0_0_4px_rgba(223,11,11,.1)]"
                        placeholder="https://drive.google.com/drive/folders/…"
                      />
                      <button
                        type="button"
                        onClick={() => void checkFormat(index)}
                        aria-label={`Check folder URL ${index + 1} format locally`}
                        className={`absolute right-2 top-2 h-8 rounded-xl px-3 text-[13px] font-semibold ${formatChecked.has(index) ? 'bg-[#def4e7] text-[#256b43]' : 'bg-[#f2f2f2] hover:bg-[#e8e8e8]'}`}
                      >
                        {formatChecked.has(index) ? (
                          <span className="flex items-center gap-1">
                            <Check className="size-3" />
                            Format OK
                          </span>
                        ) : (
                          'Check format'
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
                          setSaveState('idle');
                          setStorageError(null);
                          setFormatChecked(
                            (current) =>
                              new Set(
                                [...current]
                                  .filter(
                                    (checkedIndex) => checkedIndex !== index,
                                  )
                                  .map((checkedIndex) =>
                                    checkedIndex > index
                                      ? checkedIndex - 1
                                      : checkedIndex,
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
                disabled={fields.length >= MAX_REFERENCES}
                onClick={() => {
                  append({ url: '' });
                  setSaveState('idle');
                  setStorageError(null);
                }}
                className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-[#0067ed] disabled:cursor-not-allowed disabled:text-[#9e9e9e]"
              >
                <Plus className="size-4" />
                Add another
              </button>
              <button
                type="submit"
                className="mt-6 h-12 w-full rounded-full bg-[#161616] text-[18px] font-semibold text-white hover:bg-[#2e2e2e]"
              >
                {saveState === 'saved' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="size-4" />
                    Saved in this browser
                  </span>
                ) : (
                  'Save folder references'
                )}
              </button>
              {storageError ? (
                <p role="alert" className="mt-2 text-[13px] text-[#cd2823]">
                  {storageError}
                </p>
              ) : null}
              <p
                aria-live="polite"
                className="mt-2 min-h-[18px] text-[13px] leading-[18px] text-[#636363]"
              >
                {saveState === 'saved'
                  ? `${fields.length} folder ${fields.length === 1 ? 'reference' : 'references'} saved locally. Return to Creatives and use Review saved references to revisit them.`
                  : 'Saving stores these URLs locally. It does not open, verify, import, or sync the folders.'}
              </p>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

function StageWorkspace({ workspaceId }: { workspaceId: string }) {
  const [onboarding, setOnboarding] = useState(false);
  const [storedState, setStoredState] = useState<StoredReferencesResult>(() =>
    readStoredReferences(workspaceId),
  );

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey(workspaceId)) {
        setStoredState(readStoredReferences(workspaceId));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [workspaceId]);

  return onboarding ? (
    <StageOnboarding
      workspaceId={workspaceId}
      storedState={storedState}
      onSaved={setStoredState}
      onBack={() => setOnboarding(false)}
    />
  ) : (
    <StageLanding
      savedCount={storedState.references.length}
      storageIssue={storedState.issue}
      onStart={() => setOnboarding(true)}
    />
  );
}

export function StagePage() {
  const { workspaceId } = useParams({ strict: false }) as {
    workspaceId: string;
  };

  return (
    <AppFrame workspaceId={workspaceId} section="stage">
      <StageWorkspace key={workspaceId} workspaceId={workspaceId} />
    </AppFrame>
  );
}
