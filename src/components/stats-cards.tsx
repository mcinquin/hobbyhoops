import { Card } from "@/lib/types";
import { Library, PenTool, Puzzle, Hash, ArrowLeftRight } from "lucide-react";

interface StatsCardsProps {
  cards: Card[];
  labels: {
    total: string;
    autographs: string;
    memorabilia: string;
    numbered: string;
    rookies: string;
    tradable: string;
  };
}

export function StatsCards({ cards, labels }: StatsCardsProps) {
  const total = cards.length;
  const autographs = cards.filter((c) => c.autograph).length;
  const memorabilia = cards.filter((c) => c.memorabilia).length;
  const serialNumbered = cards.filter((c) => c.serialNumber).length;
  const rookies = cards.filter((c) => c.rookie).length;
  const tradable = cards.filter((c) => c.tradable).length;

  const stats = [
    {
      id: "total",
      label: labels.total,
      value: total,
      icon: Library,
      color: "text-foreground",
    },
    {
      id: "autographs",
      label: labels.autographs,
      value: autographs,
      icon: PenTool,
      color: "text-amber-500",
    },
    {
      id: "memorabilia",
      label: labels.memorabilia,
      value: memorabilia,
      icon: Puzzle,
      color: "text-blue-500",
    },
    {
      id: "numbered",
      label: labels.numbered,
      value: serialNumbered,
      icon: Hash,
      color: "text-red-500",
    },
    {
      id: "rookies",
      label: labels.rookies,
      value: rookies,
      icon: Library,
      color: "text-emerald-500",
    },
    {
      id: "tradable",
      label: labels.tradable,
      value: tradable,
      icon: ArrowLeftRight,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="min-w-0 rounded-lg border border-border bg-card p-3 sm:p-4"
        >
          <div className="mb-2 flex min-w-0 items-center gap-2">
            <stat.icon className={`h-4 w-4 shrink-0 ${stat.color}`} />
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {stat.label}
            </span>
          </div>
          <p className={`text-xl font-bold sm:text-2xl ${stat.color}`}>
            {stat.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
