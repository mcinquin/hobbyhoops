import dynamic from "next/dynamic";
import Link from "next/link";
import { Gem } from "lucide-react";
import type { RarityStats } from "@/lib/types";
import {
  printRunCollectionHref,
  serialPositionCollectionHref,
} from "@/lib/dashboard-chart-data";
import { getTranslations } from "@/i18n/server";
import { RarestCardsList } from "./rarest-cards-list";

const PrintRunChart = dynamic(
  () => import("./print-run-chart").then((mod) => mod.PrintRunChart),
  { loading: () => <div className="h-[220px] animate-pulse rounded-md bg-muted/40" /> }
);

interface RaritySectionProps {
  rarity: RarityStats;
}

/**
 * Dashboard rarity block: print-run tiers, special-number tiles (1/1, #1 and last of
 * the run, 1/1 excluded from the last two) and the rarest cards.
 */
export async function RaritySection({ rarity }: RaritySectionProps) {
  const { t } = await getTranslations();
  const numberedCount = rarity.tiers.reduce((sum, row) => sum + row.count, 0);
  if (numberedCount === 0) return null;

  const oneOfOne = rarity.tiers.find((row) => row.tier === "oneOfOne");
  const specialTiles = [
    {
      id: "oneOfOne",
      label: t("dashboard.rarity.oneOfOne"),
      hint: t("dashboard.rarity.oneOfOneHint"),
      value: oneOfOne?.count ?? 0,
      href: printRunCollectionHref({ min: 1, max: 1 }),
    },
    {
      id: "first",
      label: t("dashboard.rarity.firstOfRun"),
      hint: t("dashboard.rarity.firstOfRunHint"),
      value: rarity.firstOfRun,
      href: serialPositionCollectionHref("first"),
    },
    {
      id: "last",
      label: t("dashboard.rarity.lastOfRun"),
      hint: t("dashboard.rarity.lastOfRunHint"),
      value: rarity.lastOfRun,
      href: serialPositionCollectionHref("last"),
    },
  ];

  return (
    <section className="min-w-0 space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
          <Gem className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{t("dashboard.rarity.title")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.rarity.numberedCount", { count: numberedCount })}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-4">
          <div>
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              {t("dashboard.rarity.byPrintRun")}
            </h3>
            <PrintRunChart tiers={rarity.tiers} cardsLabel={t("common.cardsLabel")} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {specialTiles.map((tile) => (
              <Link
                key={tile.id}
                href={tile.href}
                className="min-w-0 rounded-lg border border-border/70 p-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
              >
                <p className="truncate text-xs text-muted-foreground">{tile.label}</p>
                <p className="text-xl font-bold text-red-500 sm:text-2xl">
                  {tile.value.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {t("dashboard.rarity.rarestTitle", { count: rarity.rarest.length })}
          </h3>
          <RarestCardsList cards={rarity.rarest} />
        </div>
      </div>
    </section>
  );
}
