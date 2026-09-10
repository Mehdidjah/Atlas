import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { ArrowUpRight, CircleAlert, CircleCheck } from 'lucide-react';
import type { DashboardData } from '@/src/lib/types';
import { percent } from '@/src/lib/formatters';

export function HomeHighlights({
  data,
  onChooseOpportunity,
}: {
  data: DashboardData;
  onChooseOpportunity: (prompt: string) => void;
}) {
  return (
    <section
      aria-labelledby="highlights-title"
      className="mt-16 border-t border-[#e8e8e8] pb-12 pt-8"
    >
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[.08em] text-[#9e9e9e]">
            Sample overview
          </p>
          <h2
            id="highlights-title"
            className="mt-1 text-[24px] font-semibold leading-[29px]"
          >
            Today’s signal
          </h2>
        </div>
        <span className="text-[13px] text-[#636363]">Demo data · Not live</span>
      </div>
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl bg-[#e8e8e8] max-md:grid-cols-2">
        {data.metrics.map((metric) => (
          <div key={metric.id} className="min-w-0 bg-white p-4">
            <div className="text-[13px] text-[#636363]">{metric.label}</div>
            <div className="tabular mt-1 text-[24px] font-semibold leading-7">
              {metric.display}
            </div>
            <div
              className={`mt-2 text-[12px] font-semibold ${metric.change >= 0 ? 'text-[#287a4b]' : 'text-[#b53a36]'}`}
            >
              {percent(metric.change)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1.5fr)_minmax(260px,.8fr)] gap-4 max-lg:grid-cols-1">
        <div className="min-w-0 rounded-2xl bg-[#f8f8f8] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Revenue trend</h3>
            <span className="text-[12px] text-[#636363]">Last 30 days</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="homeRevenue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#734ede" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#734ede" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e8e8e8" />
                <XAxis
                  dataKey="date"
                  padding={{ left: 16, right: 16 }}
                  tickFormatter={(value: string) =>
                    new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(value))
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#777' }}
                  interval={3}
                />
                <Tooltip
                  formatter={(value) => [
                    new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    }).format(Number(value)),
                    'Revenue',
                  ]}
                  contentStyle={{
                    border: 0,
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-flyout)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#734ede"
                  strokeWidth={2}
                  fill="url(#homeRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-[#e8e8e8] p-5">
          <h3 className="font-semibold">Opportunities</h3>
          <div className="mt-2 grid gap-1">
            {data.opportunities.slice(0, 2).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  onChooseOpportunity(
                    `Help me evaluate this sample opportunity before making a decision: ${item.title}. ${item.detail}`,
                  )
                }
                className="group -mx-2 flex items-start gap-3 rounded-xl p-2 text-left hover:bg-[#f8f8f8]"
              >
                <span
                  className={`mt-0.5 ${item.tone === 'good' ? 'text-[#287a4b]' : 'text-[#b36b00]'}`}
                >
                  {item.tone === 'good' ? (
                    <CircleCheck className="size-4" />
                  ) : (
                    <CircleAlert className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{item.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-[17px] text-[#636363]">
                    {item.detail}
                  </span>
                </span>
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-[#9e9e9e] opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
