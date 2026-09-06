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
import { toast } from 'sonner';
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
import { currency } from '@/src/lib/formatters';
import { demoApi } from '@/src/lib/demo-api';

const column = createColumnHelper<Campaign>();

export function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'spend', desc: true },
  ]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [statusOverrides, setStatusOverrides] = useState<
    Partial<Record<string, Campaign['status']>>
  >({});
  const rows = useMemo(
    () =>
      campaigns.map((campaign) => ({
        ...campaign,
        status: statusOverrides[campaign.id] ?? campaign.status,
      })),
    [campaigns, statusOverrides],
  );
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Campaign['status'] }) =>
      demoApi.updateCampaign(id, status),
    onSuccess: ({ id, status }) => {
      setStatusOverrides((current) => ({ ...current, [id]: status }));
      toast.success(
        `Campaign ${status === 'Paused' ? 'paused' : 'activated'}`,
        { description: 'Demo state only — no ad account was changed.' },
      );
    },
  });
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
        cell: ({ getValue }) => `${getValue().toFixed(2)}×`,
        meta: { numeric: true },
      }),
      column.accessor('cpa', {
        header: 'CPA',
        cell: ({ getValue }) =>
          getValue() ? currency.format(getValue()) : '—',
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
                  className="grid size-8 place-items-center rounded-lg hover:bg-[#f2f2f2]"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() =>
                  update.mutate({
                    id: row.original.id,
                    status:
                      row.original.status === 'Active' ? 'Paused' : 'Active',
                  })
                }
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSelectedCampaign(row.original)}
              >
                View details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    [update],
  );
  const table = useReactTable({
    data: rows,
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
      <Dialog
        open={Boolean(selectedCampaign)}
        onOpenChange={(open) => {
          if (!open) setSelectedCampaign(null);
        }}
      >
        <DialogContent className="w-[560px] max-w-[calc(100vw-24px)] rounded-3xl p-6 sm:max-w-[560px] data-open:animate-none data-closed:animate-none">
          <DialogHeader>
            <DialogTitle className="pr-10 text-[24px] font-semibold leading-7">
              {selectedCampaign?.name}
            </DialogTitle>
            <DialogDescription>
              Campaign delivery snapshot · {selectedCampaign?.updatedAt}
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign ? (
            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#e8e8e8]">
              {[
                ['Status', selectedCampaign.status],
                ['Channel', selectedCampaign.channel],
                ['Spend', currency.format(selectedCampaign.spend)],
                ['Revenue', currency.format(selectedCampaign.revenue)],
                ['ROAS', `${selectedCampaign.roas.toFixed(2)}×`],
                ['Conversions', selectedCampaign.conversions.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="bg-white p-4">
                  <div className="text-[12px] font-semibold uppercase tracking-[.06em] text-[#9e9e9e]">
                    {label}
                  </div>
                  <div className="tabular mt-1 font-semibold">{value}</div>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-4 rounded-xl bg-[#f8f8f8] p-3 text-[13px] text-[#636363]">
            This is a deterministic demo snapshot. Production details will be
            loaded from your connected ad account.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
