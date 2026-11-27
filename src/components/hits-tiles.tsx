import Link from "next/link";
import { Crown, Gem, Hash, PenTool, Sparkles, type LucideIcon } from "lucide-react";
import {
  COLLECTION_HITS,
  hitCollectionHref,
  type CollectionHitId,
} from "@/lib/collection-hits";
import { getTranslations } from "@/i18n/server";

const HIT_STYLES: Record<CollectionHitId, { icon: LucideIcon; color: string }> = {
  rpa: { icon: Sparkles, color: "text-red-500" },
  rcAuto: { icon: PenTool, color: "text-emerald-500" },
  numberedAuto: { icon: Hash, color: "text-amber-500" },
  oneOfOne: { icon: Crown, color: "text-rose-500" },
  upTo10: { icon: Gem, color: "text-purple-500" },
};

interface HitsTilesProps {
  counts: Record<CollectionHitId, number>;
}

/** Dashboard "hits" row: valued combinations, each opening the matching collection filter. */
export async function HitsTiles({ counts }: HitsTilesProps) {
  const { t } = await getTranslations();

  return (
    <section aria-labelledby="dashboard-hits-title" className="min-w-0 space-y-3">
      <h2 id="dashboard-hits-title" className="text-sm font-medium text-muted-foreground">
        {t("dashboard.hits.title")}
      </h2>
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
        {COLLECTION_HITS.map((hit) => {
          const { icon: Icon, color } = HIT_STYLES[hit.id];
          return (
            <Link
              key={hit.id}
              href={hitCollectionHref(hit)}
              className="min-w-0 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
            >
              <div className="mb-2 flex min-w-0 items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {t(`dashboard.hits.${hit.id}.label`)}
                </span>
              </div>
              <p className={`text-xl font-bold sm:text-2xl ${color}`}>
                {counts[hit.id].toLocaleString()}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {t(`dashboard.hits.${hit.id}.hint`)}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
