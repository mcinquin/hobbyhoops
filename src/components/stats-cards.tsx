import type { CollectionStats } from "@/lib/types";
import Link from "next/link";
import { Library, PenTool, Puzzle, Hash, ArrowLeftRight } from "lucide-react";

interface StatsCardsProps {
  stats: CollectionStats;
  labels: {
    total: string;
    autographs: string;
    memorabilia: string;
    numbered: string;
    rookies: string;
    tradable: string;
  };
}

export function StatsCards({ stats, labels }: StatsCardsProps) {
  const items = [
    {
      id: "total",
      label: labels.total,
      value: stats.total,
      icon: Library,
      color: "text-foreground",
      href: "/collection",
    },
    {
      id: "autographs",
      label: labels.autographs,
      value: stats.autographs,
      icon: PenTool,
      color: "text-amber-500",
      href: "/collection?tag=autograph",
    },
    {
      id: "memorabilia",
      label: labels.memorabilia,
      value: stats.memorabilia,
      icon: Puzzle,
      color: "text-blue-500",
      href: "/collection?tag=memorabilia",
    },
    {
      id: "numbered",
      label: labels.numbered,
      value: stats.numbered,
      icon: Hash,
      color: "text-red-500",
      href: "/collection?tag=numbered",
    },
    {
      id: "rookies",
      label: labels.rookies,
      value: stats.rookies,
      icon: Library,
      color: "text-emerald-500",
      href: "/collection?tag=rookie",
    },
    {
      id: "tradable",
      label: labels.tradable,
      value: stats.tradable,
      icon: ArrowLeftRight,
      color: "text-purple-500",
      href: "/collection?tag=tradable",
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
      {items.map((stat) => (
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
