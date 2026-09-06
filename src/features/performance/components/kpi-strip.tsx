import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { KpiMetric } from '@/src/lib/types';
import { percent } from '@/src/lib/formatters';

export function KpiStrip({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <section
      className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-[#e8e8e8] bg-[#e8e8e8] max-xl:grid-cols-2 max-sm:grid-cols-1"
      aria-label="Performance summary"
    >
      {metrics.map((metric) => (
        <div key={metric.id} className="min-w-0 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[13px] text-[#636363]">{metric.label}</div>
              <div className="tabular mt-1 text-[30px] font-semibold leading-[33px]">
                {metric.display}
              </div>
            </div>
            <div className="h-11 w-20">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                  data={metric.trend.map((value, index) => ({ index, value }))}
                >
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={metric.change >= 0 ? '#287a4b' : '#b53a36'}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-[12px]">
            <span
              className={`font-semibold ${metric.change >= 0 ? 'text-[#287a4b]' : 'text-[#b53a36]'}`}
            >
              {percent(metric.change)}
            </span>
            <span className="truncate text-[#9e9e9e]">{metric.comparison}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
