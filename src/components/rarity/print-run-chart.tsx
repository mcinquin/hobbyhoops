"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  printRunCollectionHref,
  printRunTierLabel,
  type PrintRunTierRow,
} from "@/lib/dashboard-chart-data";

/** Rarer tiers get warmer colours (1/1 = red … > /199 = slate). */
const TIER_COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(24, 95%, 53%)",
  "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(199, 89%, 48%)",
  "hsl(220, 14%, 55%)",
];

interface PrintRunChartProps {
  tiers: PrintRunTierRow[];
  cardsLabel: string;
}

/** Bar chart of the print-run tiers; each bar opens the collection filtered on its tier. */
export function PrintRunChart({ tiers, cardsLabel }: PrintRunChartProps) {
  const router = useRouter();
  const data = tiers.map((row) => ({ ...row, name: printRunTierLabel(row) }));

  function open(row: PrintRunTierRow): void {
    if (row.count > 0) router.push(printRunCollectionHref(row));
  }

  function onKeyDown(event: KeyboardEvent<SVGElement>, row: PrintRunTierRow): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    open(row);
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -20, right: 4 }}>
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
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(38, 92%, 50%, 0.12)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,12%)] px-3 py-2 text-sm shadow-md">
                <p className="mb-1 text-[hsl(0,0%,70%)]">{label}</p>
                <p className="font-medium text-amber-500">
                  {cardsLabel} : {payload[0]?.value}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" name={cardsLabel} radius={[4, 4, 0, 0]} className="cursor-pointer">
          {data.map((row, i) => (
            <Cell
              key={row.tier}
              fill={TIER_COLORS[i % TIER_COLORS.length]}
              role="link"
              tabIndex={row.count > 0 ? 0 : -1}
              aria-label={`${row.name} - ${row.count} ${cardsLabel}`}
              onClick={() => open(row)}
              onKeyDown={(event) => onKeyDown(event, row)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
