"use client";

import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { InvestmentHistoryPoint } from "@/lib/investment-portfolio";
import { formatMoney } from "@/lib/money";
import { useI18n, useTranslations } from "@/i18n/client";

const VALUE_COLOR = "hsl(173, 80%, 40%)";
const COST_COLOR = "hsl(0, 0%, 60%)";

interface InvestmentValueChartProps {
  data: InvestmentHistoryPoint[];
  currency: string;
}

/** Month-end portfolio value against its cost (one currency). */
export function InvestmentValueChart({ data, currency }: InvestmentValueChartProps) {
  const { locale } = useI18n();
  const t = useTranslations();
  const chartData = data.map((point) => ({
    name: point.name,
    value: point.valueCents / 100,
    cost: point.costCents / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ left: -10, right: 4, bottom: 8 }}>
        <defs>
          <linearGradient id="investment-value-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VALUE_COLOR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={VALUE_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as { value: number; cost: number } | undefined;
            if (!point) return null;
            return (
              <div className="rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)] px-3 py-2 text-sm shadow-md">
                {label ? <p className="mb-1 text-[hsl(0,0%,70%)]">{label}</p> : null}
                <p className="font-medium" style={{ color: VALUE_COLOR }}>
                  {t("investments.chart.value")} :{" "}
                  {formatMoney(Math.round(point.value * 100), currency, locale)}
                </p>
                <p style={{ color: COST_COLOR }}>
                  {t("investments.chart.cost")} :{" "}
                  {formatMoney(Math.round(point.cost * 100), currency, locale)}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={VALUE_COLOR}
          strokeWidth={2}
          fill="url(#investment-value-fill)"
        />
        <Line
          type="stepAfter"
          dataKey="cost"
          stroke={COST_COLOR}
          strokeDasharray="4 4"
          dot={false}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
