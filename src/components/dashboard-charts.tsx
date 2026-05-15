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

const COLORS = [
  "hsl(38, 92%, 50%)",
  "hsl(220, 70%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(0, 72%, 51%)",
  "hsl(262, 83%, 58%)",
  "hsl(38, 92%, 60%)",
  "hsl(220, 70%, 60%)",
  "hsl(142, 71%, 55%)",
];

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t("dashboard.byBrand")}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={brandData}>
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
              contentStyle={{
                background: "hsl(0, 0%, 12%)",
                border: "1px solid hsl(0, 0%, 20%)",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" name={cardsLabel} radius={[4, 4, 0, 0]}>
              {brandData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t("dashboard.byYear")}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={yearData}>
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
              contentStyle={{
                background: "hsl(0, 0%, 12%)",
                border: "1px solid hsl(0, 0%, 20%)",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" name={cardsLabel} fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t("dashboard.topPlayers")}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={playerData} layout="vertical">
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
              width={150}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 12%)",
                border: "1px solid hsl(0, 0%, 20%)",
                borderRadius: "8px",
              }}
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
