import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PerformancePoint } from '@/src/lib/types';
import { compactCurrency } from '@/src/lib/formatters';

export function PerformanceChart({
  data,
  range: _range,
}: {
  data: PerformancePoint[];
  range: '7d' | '30d' | '90d';
}) {
  const [showSpend, setShowSpend] = useState(true);
  const [showRevenue, setShowRevenue] = useState(true);
  const visibleData = data;
  return (
    <section
      className="mt-5 min-w-0 rounded-2xl border border-[#e8e8e8] p-5"
      aria-labelledby="chart-title"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="chart-title" className="text-[18px] font-semibold">
            Revenue and spend
          </h2>
          <p className="mt-1 text-[13px] text-[#636363]">
            {data.length} daily sample points · all current campaign filters
            apply
          </p>
        </div>
        <div className="flex gap-2">
          <button
            aria-pressed={showRevenue}
            disabled={showRevenue && !showSpend}
            onClick={() => setShowRevenue((value) => !value)}
            className={`flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-semibold ${showRevenue ? 'bg-[#eee8ff]' : 'bg-[#f2f2f2] text-[#636363]'}`}
          >
            <span className="size-2 rounded-full bg-[#734ede]" />
            Revenue
          </button>
          <button
            aria-pressed={showSpend}
            disabled={showSpend && !showRevenue}
            onClick={() => setShowSpend((value) => !value)}
            className={`flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-semibold ${showSpend ? 'bg-[#def4e7]' : 'bg-[#f2f2f2] text-[#636363]'}`}
          >
            <span className="size-2 rounded-full bg-[#287a4b]" />
            Spend
          </button>
        </div>
      </div>
      <div className="h-[320px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={visibleData}
            accessibilityLayer
            margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#734ede" stopOpacity={0.18} />
                <stop offset="1" stopColor="#734ede" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#45b97c" stopOpacity={0.16} />
                <stop offset="1" stopColor="#45b97c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e8e8e8" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) =>
                new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#636363' }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#636363' }}
              tickFormatter={(value: number) => compactCurrency.format(value)}
              width={58}
            />
            <Tooltip
              formatter={(value) => compactCurrency.format(Number(value))}
              contentStyle={{
                background: 'white',
                border: 0,
                borderRadius: 12,
                boxShadow: 'var(--shadow-flyout)',
                fontSize: 12,
              }}
            />
            {showRevenue ? (
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="revenue"
                stroke="#734ede"
                strokeWidth={2}
                fill="url(#revenueFill)"
              />
            ) : null}
            {showSpend ? (
              <Area
                type="monotone"
                dataKey="spend"
                stroke="#287a4b"
                strokeWidth={2}
                fill="url(#spendFill)"
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
