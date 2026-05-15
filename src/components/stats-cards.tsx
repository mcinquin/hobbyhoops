"use client";

import { useMemo } from "react";
import { Card } from "@/lib/types";
import { Library, PenTool, Puzzle, Hash, ArrowLeftRight } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface StatsCardsProps {
  cards: Card[];
}

export function StatsCards({ cards }: StatsCardsProps) {
  const t = useTranslations();

  const total = cards.length;
  const autographs = cards.filter((c) => c.autograph).length;
  const memorabilia = cards.filter((c) => c.memorabilia).length;
  const serialNumbered = cards.filter((c) => c.serialNumber).length;
  const rookies = cards.filter((c) => c.rookie).length;
  const tradable = cards.filter((c) => c.tradable).length;

  const stats = useMemo(
    () => [
      {
        id: "total",
        label: t("dashboard.stats.total"),
        value: total,
        icon: Library,
        color: "text-foreground",
      },
      {
        id: "autographs",
        label: t("dashboard.stats.autographs"),
        value: autographs,
        icon: PenTool,
        color: "text-amber-500",
      },
      {
        id: "memorabilia",
        label: t("dashboard.stats.memorabilia"),
        value: memorabilia,
        icon: Puzzle,
        color: "text-blue-500",
      },
      {
        id: "numbered",
        label: t("dashboard.stats.numbered"),
        value: serialNumbered,
        icon: Hash,
        color: "text-red-500",
      },
      {
        id: "rookies",
        label: t("dashboard.stats.rookies"),
        value: rookies,
        icon: Library,
        color: "text-emerald-500",
      },
      {
        id: "tradable",
        label: t("dashboard.stats.tradable"),
        value: tradable,
        icon: ArrowLeftRight,
        color: "text-purple-500",
      },
    ],
    [t, total, autographs, memorabilia, serialNumbered, rookies, tradable]
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="bg-card border border-border rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
