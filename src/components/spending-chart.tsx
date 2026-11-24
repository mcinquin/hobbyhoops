"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";
import { useI18n } from "@/i18n/client";

const SPENDING_COLOR = "hsl(142, 71%, 45%)";

interface SpendingChartProps {
  data: { name: string; totalCents: number }[];
  currency: string;
}

/** Monthly purchase spending bar chart (one currency). */
export function SpendingChart({ data, currency }: SpendingChartProps) {
  const { locale } = useI18n();
  const chartData = data.map((row) => ({ name: row.name, amount: row.totalCents / 100 }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: -10, right: 4, bottom: 8 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          height={56}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(142, 71%, 45%, 0.12)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const amount = Number(payload[0]?.value ?? 0);
            return (
              <div className="rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)] px-3 py-2 text-sm shadow-md">
                {label ? <p className="mb-1 text-[hsl(0,0%,70%)]">{label}</p> : null}
                <p className="font-medium" style={{ color: SPENDING_COLOR }}>
                  {formatMoney(Math.round(amount * 100), currency, locale)}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="amount" fill={SPENDING_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
