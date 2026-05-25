"use client";

import {
  buildChartCountData,
  chartDataWithCards,
  referenceSetNames,
} from "@/lib/dashboard-chart-data";
import { Card, type References } from "@/lib/types";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
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
  references: References;
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

function collectionHref(
  key: "brand" | "set" | "year" | "player",
  value: string
): string {
  const params = new URLSearchParams({ [key]: value });
  return `/collection?${params.toString()}`;
}

function getDatumName(entry: unknown): string | null {
  if (typeof entry !== "object" || entry === null) return null;
  const candidate = entry as { name?: unknown; payload?: { name?: unknown } };
  const name = candidate.name ?? candidate.payload?.name;
  return typeof name === "string" && name ? name : null;
}

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

export function DashboardCharts({ cards, references }: DashboardChartsProps) {
  const t = useTranslations();
  const router = useRouter();
  const cardsLabel = t("common.cardsLabel");

  function drillDown(
    key: "brand" | "set" | "year" | "player",
    entry: unknown
  ): void {
    const name = getDatumName(entry);
    if (name) router.push(collectionHref(key, name));
  }

  function openCollectionFilter(
    key: "brand" | "set" | "year" | "player",
    value: string
  ): void {
    router.push(collectionHref(key, value));
  }

  function handleChartKeyDown(
    event: KeyboardEvent<SVGElement>,
    key: "brand" | "set" | "year" | "player",
    value: string
  ): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openCollectionFilter(key, value);
  }

  const brandData = chartDataWithCards(
    buildChartCountData(references.brands, cards, (card) => card.brand)
  ).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const yearData = chartDataWithCards(
    buildChartCountData(references.years, cards, (card) => card.year)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const setData = chartDataWithCards(
    buildChartCountData(referenceSetNames(references), cards, (card) => card.set)
  ).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

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
            <Bar
              dataKey="count"
              name={cardsLabel}
              radius={[4, 4, 0, 0]}
              className="cursor-pointer"
              onClick={(entry) => drillDown("brand", entry)}
            >
              {brandData.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[i % COLORS.length]}
                  role="link"
                  tabIndex={0}
                  aria-label={`${entry.name} - ${entry.count} ${cardsLabel}`}
                  onClick={() => openCollectionFilter("brand", entry.name)}
                  onKeyDown={(event) =>
                    handleChartKeyDown(event, "brand", entry.name)
                  }
                />
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
              className="cursor-pointer"
              onClick={(entry) => drillDown("year", entry)}
            >
              {yearData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={CHART_COUNT_COLOR}
                  role="link"
                  tabIndex={0}
                  aria-label={`${entry.name} - ${entry.count} ${cardsLabel}`}
                  onClick={() => openCollectionFilter("year", entry.name)}
                  onKeyDown={(event) =>
                    handleChartKeyDown(event, "year", entry.name)
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6 lg:col-span-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t("dashboard.bySet")}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={setData} margin={{ left: -20, right: 4, bottom: 8 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(0, 0%, 70%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={56}
              interval={0}
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
              radius={[4, 4, 0, 0]}
              className="cursor-pointer"
              onClick={(entry) => drillDown("set", entry)}
            >
              {setData.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[(i + 2) % COLORS.length]}
                  role="link"
                  tabIndex={0}
                  aria-label={`${entry.name} - ${entry.count} ${cardsLabel}`}
                  onClick={() => openCollectionFilter("set", entry.name)}
                  onKeyDown={(event) =>
                    handleChartKeyDown(event, "set", entry.name)
                  }
                />
              ))}
            </Bar>
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
            <Bar
              dataKey="count"
              name={cardsLabel}
              radius={[0, 4, 4, 0]}
              className="cursor-pointer"
              onClick={(entry) => drillDown("player", entry)}
            >
              {playerData.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[i % COLORS.length]}
                  role="link"
                  tabIndex={0}
                  aria-label={`${entry.name} - ${entry.count} ${cardsLabel}`}
                  onClick={() => openCollectionFilter("player", entry.name)}
                  onKeyDown={(event) =>
                    handleChartKeyDown(event, "player", entry.name)
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
