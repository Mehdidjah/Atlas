import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  MoreHorizontal,
  Pause,
  Play,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { ErrorNotice, SuccessNotice, useRefreshPerformance } from './workflow';
import { DraftEditor } from './draft-workflow';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Campaign } from '@/src/lib/types';
import { preciseCurrency as currency } from '@/src/lib/formatters';
import { demoApi } from '@/src/lib/demo-api';

const column = createColumnHelper<Campaign>();

export function CampaignTable({
  campaigns,
  workspaceId,
  busy = false,
  onNotice,
}: {
  campaigns: Campaign[];
  workspaceId: string;
  busy?: boolean;
  onNotice?: (message: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'spend', desc: true },
  ]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [selected, setSelected] = useState<Campaign | null>(null),
    [action, setAction] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [budget, setBudget] = useState<Campaign | null>(null),
    [success, setLocalSuccess] = useState('');
  const setSuccess = (message: string) => {
    if (onNotice) onNotice(message);
    else setLocalSuccess(message);
  };
  const refresh = useRefreshPerformance(workspaceId);
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Campaign['status'] }) =>
      demoApi.updateCampaign(id, status, workspaceId),
    onSuccess: async ({ status }) => {
      await refresh();
      setSelected(null);
      setAction(false);
      setSuccess(
        `Sample status changed to ${status}. Only the local label changed; historical sample results and real ad delivery are unchanged.`,
      );
    },
  });
  const active = campaigns.find((c) => c.id === selected?.id) ?? selected;
  const columns = useMemo(
    () => [
      column.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => (
          <span
            className={`inline-flex h-5 items-center rounded-full px-2 text-[12px] font-semibold ${getValue() === 'Active' ? 'bg-[#def4e7] text-[#256b43]' : getValue() === 'Paused' ? 'bg-[#fff0c4] text-[#835d00]' : 'bg-[#f2f2f2] text-[#636363]'}`}
          >
            {getValue()}
          </span>
        ),
      }),
      column.accessor('name', {
        header: 'Campaign',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      column.accessor('channel', { header: 'Channel' }),
      column.accessor('spend', {
        header: 'Spend',
        cell: ({ getValue }) => currency.format(getValue()),
        meta: { numeric: true },
      }),
      column.accessor('revenue', {
        header: 'Revenue',
        cell: ({ getValue }) => currency.format(getValue()),
        meta: { numeric: true },
      }),
      column.accessor('roas', {
        header: 'ROAS',
        cell: ({ row, getValue }) =>
          row.original.spend ? `${getValue().toFixed(2)}×` : 'N/A',
        meta: { numeric: true },
      }),
      column.accessor('cpa', {
        header: 'CPA',
        cell: ({ getValue }) =>
          getValue() ? currency.format(getValue()) : 'N/A',
        meta: { numeric: true },
      }),
      column.accessor('conversions', {
        header: 'Conversions',
        meta: { numeric: true },
      }),
      column.accessor('updatedAt', { header: 'Last updated' }),
      column.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  aria-label={`Actions for ${row.original.name}`}
                  disabled={busy}
                  className="grid size-8 place-items-center rounded-lg hover:bg-[#f2f2f2] disabled:opacity-50"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                disabled={busy || row.original.status === 'Draft'}
                onClick={() => {
                  setSelected(row.original);
                  setAction(true);
                  setConfirmed(false);
                  update.reset();
                }}
              >
                {row.original.status === 'Active' ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
                {row.original.status === 'Active'
                  ? 'Pause campaign'
                  : 'Activate campaign'}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={busy || row.original.status === 'Draft'}
                onClick={() => setBudget(row.original)}
              >
                Prepare budget request
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={busy}
                onClick={() => {
                  setSelected(row.original);
                  setAction(false);
                  setConfirmed(false);
                  update.reset();
                }}
              >
                View details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    [busy, update],
  );
  const table = useReactTable({
    data: campaigns,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 6 } },
  });

  return (
    <>
      {success && <SuccessNotice>{success}</SuccessNotice>}
      <section
        className="mt-5 overflow-hidden rounded-2xl border border-[#e8e8e8]"
        aria-labelledby="campaigns-title"
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div>
            <h2 id="campaigns-title" className="font-semibold">
              Campaigns
            </h2>
            <span className="text-[12px] text-[#9e9e9e]">
              {campaigns.length} matching{' '}
              {campaigns.length === 1 ? 'campaign' : 'campaigns'}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  aria-label="Choose visible columns"
                  className="flex h-8 items-center gap-2 rounded-full border border-[#e0e0e0] px-3 text-[13px] font-semibold hover:bg-[#f8f8f8]"
                />
              }
            >
              <Columns3 className="size-4" />
              Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                {table
                  .getAllLeafColumns()
                  .filter((item) => item.id !== 'actions')
                  .map((item) => (
                    <DropdownMenuCheckboxItem
                      key={item.id}
                      checked={item.getIsVisible()}
                      onCheckedChange={(checked) =>
                        item.toggleVisibility(Boolean(checked))
                      }
                    >
                      {typeof item.columnDef.header === 'string'
                        ? item.columnDef.header
                        : item.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Table className="min-w-[1050px]">
          <TableHeader className="sticky top-0 z-10 bg-[#f8f8f8]">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      header.column.getCanSort()
                        ? header.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : header.column.getIsSorted() === 'desc'
                            ? 'descending'
                            : 'none'
                        : undefined
                    }
                    className={`h-10 px-4 text-[12px] font-semibold ${(header.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric ? 'text-right' : ''}`}
                  >
                    <button
                      type="button"
                      aria-label={
                        typeof header.column.columnDef.header === 'string' &&
                        header.column.columnDef.header
                          ? `Sort by ${header.column.columnDef.header}`
                          : 'Table column'
                      }
                      className="inline-flex items-center gap-1"
                      onClick={header.column.getToggleSortingHandler()}
                      disabled={!header.column.getCanSort()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getCanSort() ? (
                        <ArrowUpDown className="size-3 text-[#9e9e9e]" />
                      ) : null}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={0}
                className="h-12 focus:bg-[#f8f8f8]"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={`px-4 ${(cell.column.columnDef.meta as { numeric?: boolean } | undefined)?.numeric ? 'tabular text-right' : ''}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex h-12 items-center justify-between border-t border-[#e8e8e8] px-4 text-[13px] text-[#636363]">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex gap-1">
            <button
              aria-label="Previous page"
              className="grid size-8 place-items-center rounded-lg hover:bg-[#f2f2f2] disabled:opacity-30"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next page"
              className="grid size-8 place-items-center rounded-lg hover:bg-[#f2f2f2] disabled:opacity-30"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !update.isPending) setSelected(null);
        }}
      >
        <DialogContent
          showCloseButton={!update.isPending}
          className="max-h-[90dvh] overflow-y-auto rounded-3xl p-6 sm:max-w-[560px]"
        >
          <DialogHeader>
            <DialogTitle className="pr-6 text-[24px] font-semibold leading-7">
              {action ? 'Confirm a local status change' : active?.name}
            </DialogTitle>
            <DialogDescription>
              Sample campaign only. No real ad changes can occur.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <>
              {action ? (
                <>
                  <div className="rounded-xl bg-[#f8f8f8] p-4">
                    <p className="font-medium">{active.name}</p>
                    <p className="mt-2">
                      {active.status} →{' '}
                      {active.status === 'Active' ? 'Paused' : 'Active'}{' '}
                      <span className="text-sm text-[#636363]">
                        (local label only)
                      </span>
                    </p>
                  </div>
                  <p className="text-sm text-[#636363]">
                    This will persist the sample status in this workspace and
                    record your confirmation in Activity. It does not alter
                    historical sample data, publish anything, or start spending.
                  </p>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#161616]"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I approve this demo-only status change.
                  </label>
                  <ErrorNotice error={update.error} />
                  <div className="flex justify-end gap-2">
                    <button
                      className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() => setAction(false)}
                    >
                      Back
                    </button>
                    <button
                      className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
                      disabled={!confirmed || update.isPending || busy}
                      onClick={() =>
                        update.mutate({
                          id: active.id,
                          status:
                            active.status === 'Active' ? 'Paused' : 'Active',
                        })
                      }
                    >
                      {update.isPending ? 'Saving…' : 'Confirm demo change'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#e8e8e8]">
                    {[
                      ['Sample status', active.status],
                      ['Platform', active.channel],
                      ['Spend', currency.format(active.spend)],
                      ['Revenue', currency.format(active.revenue)],
                      [
                        'ROAS',
                        active.spend ? `${active.roas.toFixed(2)}×` : 'N/A',
                      ],
                      [
                        'Cost per acquisition',
                        active.conversions
                          ? currency.format(active.cpa)
                          : 'N/A',
                      ],
                      ['Conversions', active.conversions.toLocaleString()],
                      ['Source', 'Synthetic, not live'],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-white p-4">
                        <dt className="text-[12px] font-semibold uppercase tracking-[.06em] text-[#9e9e9e]">
                          {label}
                        </dt>
                        <dd className="mt-1 font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-sm text-[#636363]">
                    Totals reflect the selected date range. ROAS = revenue ÷
                    spend. CPA = spend ÷ conversions. Current budget is not
                    available from this fixture.
                  </p>
                  {active.status === 'Draft' ? (
                    <p className="rounded-lg bg-[#f8f8f8] p-3 text-sm text-[#636363]">
                      Drafts cannot be activated. Saved campaign drafts can be
                      reviewed in Launch; fixture drafts are examples only.
                    </p>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        className="h-9 rounded-full border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold hover:bg-[#f8f8f8] disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          setAction(true);
                          setConfirmed(false);
                        }}
                      >
                        {active.status === 'Active'
                          ? 'Review pause'
                          : 'Review resume'}{' '}
                        · demo
                      </button>
                      <button
                        className="h-9 rounded-full bg-[#161616] px-4 text-[13px] font-semibold text-white hover:bg-[#2e2e2e] disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          setBudget(active);
                          setSelected(null);
                        }}
                      >
                        Prepare budget request
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      {budget && (
        <DraftEditor
          workspaceId={workspaceId}
          initial={{
            name: `${budget.name} · budget review`.slice(0, 100),
            channel: budget.channel,
            objective: 'Sales',
            dailyBudget: 100,
          }}
          options={{
            campaignId: budget.id,
            reason:
              'User-requested budget review. Current budget is unknown; the amount is a proposed absolute daily budget, not an increase.',
          }}
          onClose={() => setBudget(null)}
          onSaved={(d) =>
            setSuccess(
              `${d.name} saved. Review and approve the proposal in Launch. No budget has been applied.`,
            )
          }
        />
      )}
    </>
  );
}
