"use client";

import { Card } from "@/lib/types";
import { useTranslations } from "@/i18n/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DashboardChartsProps {
  cards: Card[];
}

/** Couleur des barres « par année » — aussi utilisée pour le libellé du tooltip au survol. */
const CHART_COUNT_COLOR = "hsl(38, 92%, 50%)";

const COLORS = [
  CHART_COUNT_COLOR,
  "hsl(220, 70%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(0, 72%, 51%)",
  "hsl(262, 83%, 58%)",
  "hsl(38, 92%, 60%)",
  "hsl(220, 70%, 60%)",
  "hsl(142, 71%, 55%)",
];

const tooltipCursor = { fill: "hsl(38, 92%, 50%, 0.12)" };

function ChartTooltipContent({
  active,
  payload,
  label,
  cardsLabel,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string }>;
  label?: string | number;
  cardsLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)] px-3 py-2 text-sm shadow-md">
      {label ? (
        <p className="mb-1 text-[hsl(0,0%,70%)]">{label}</p>
      ) : null}
      <p className="font-medium" style={{ color: CHART_COUNT_COLOR }}>
        {cardsLabel} : {value}
      </p>
    </div>
  );
}

export function DashboardCharts({ cards }: DashboardChartsProps) {
  const t = useTranslations();
  const cardsLabel = t("common.cardsLabel");

  const brandData = Object.entries(
    cards.reduce(
      (acc, c) => {
        if (c.brand) acc[c.brand] = (acc[c.brand] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const yearData = Object.entries(
    cards.reduce(
      (acc, c) => {
        if (c.year) acc[c.year] = (acc[c.year] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const playerData = Object.entries(
    cards.reduce(
      (acc, c) => {
        if (c.player) acc[c.player] = (acc[c.player] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t("dashboard.byBrand")}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={brandData} margin={{ left: -20, right: 4 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltipContent
                  active={props.active}
                  payload={
                    props.payload as
                      | ReadonlyArray<{ value?: number | string }>
                      | undefined
                  }
                  label={props.label}
                  cardsLabel={cardsLabel}
                />
              )}
              cursor={tooltipCursor}
            />
            <Bar dataKey="count" name={cardsLabel} radius={[4, 4, 0, 0]}>
              {brandData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t("dashboard.byYear")}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={yearData} margin={{ left: -20, right: 4 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltipContent
                  active={props.active}
                  payload={
                    props.payload as
                      | ReadonlyArray<{ value?: number | string }>
                      | undefined
                  }
                  label={props.label}
                  cardsLabel={cardsLabel}
                />
              )}
              cursor={tooltipCursor}
            />
            <Bar
              dataKey="count"
              name={cardsLabel}
              fill={CHART_COUNT_COLOR}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6 lg:col-span-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t("dashboard.topPlayers")}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={playerData}
            layout="vertical"
            margin={{ left: 0, right: 4 }}
          >
            <XAxis
              type="number"
              tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={96}
            />
            <Tooltip
              content={(props) => (
                <ChartTooltipContent
                  active={props.active}
                  payload={
                    props.payload as
                      | ReadonlyArray<{ value?: number | string }>
                      | undefined
                  }
                  label={props.label}
                  cardsLabel={cardsLabel}
                />
              )}
              cursor={tooltipCursor}
            />
            <Bar dataKey="count" name={cardsLabel} radius={[0, 4, 4, 0]}>
              {playerData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
