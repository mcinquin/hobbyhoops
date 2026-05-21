import { Card } from "@/lib/types";
import Link from "next/link";
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

function countCardStats(cards: Card[]) {
  return cards.reduce(
    (acc, card) => {
      acc.total += 1;
      if (card.autograph) acc.autographs += 1;
      if (card.memorabilia) acc.memorabilia += 1;
      if (card.serialNumber) acc.numbered += 1;
      if (card.rookie) acc.rookies += 1;
      if (card.tradable) acc.tradable += 1;
      return acc;
    },
    {
      total: 0,
      autographs: 0,
      memorabilia: 0,
      numbered: 0,
      rookies: 0,
      tradable: 0,
    }
  );
}

export function StatsCards({ cards, labels }: StatsCardsProps) {
  const counts = countCardStats(cards);

  const stats = [
    {
      id: "total",
      label: labels.total,
      value: counts.total,
      icon: Library,
      color: "text-foreground",
      href: "/collection",
    },
    {
      id: "autographs",
      label: labels.autographs,
      value: counts.autographs,
      icon: PenTool,
      color: "text-amber-500",
      href: "/collection?tag=autograph",
    },
    {
      id: "memorabilia",
      label: labels.memorabilia,
      value: counts.memorabilia,
      icon: Puzzle,
      color: "text-blue-500",
      href: "/collection?tag=memorabilia",
    },
    {
      id: "numbered",
      label: labels.numbered,
      value: counts.numbered,
      icon: Hash,
      color: "text-red-500",
      href: "/collection?tag=numbered",
    },
    {
      id: "rookies",
      label: labels.rookies,
      value: counts.rookies,
      icon: Library,
      color: "text-emerald-500",
      href: "/collection?tag=rookie",
    },
    {
      id: "tradable",
      label: labels.tradable,
      value: counts.tradable,
      icon: ArrowLeftRight,
      color: "text-purple-500",
      href: "/collection?tag=tradable",
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
      {stats.map((stat) => (
        <Link
          key={stat.id}
          href={stat.href}
          className="min-w-0 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
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
        </Link>
      ))}
    </div>
  );
}
