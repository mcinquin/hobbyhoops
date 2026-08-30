import Link from "next/link";

interface LeagueSummaryProps {
  nba: number;
  wnba: number;
  labels: {
    title: string;
    nba: string;
    wnba: string;
  };
}

/** Carré récapitulatif du nombre de cartes NBA vs WNBA, avec une barre de répartition. */
export function LeagueSummary({ nba, wnba, labels }: LeagueSummaryProps) {
  const total = nba + wnba;
  const nbaPct = total > 0 ? Math.round((nba / total) * 100) : 0;
  const wnbaPct = total > 0 ? 100 - nbaPct : 0;

  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-4 sm:p-6">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
        {labels.title}
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Link
          href="/collection?tag=nba"
          className="min-w-0 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
        >
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {labels.nba}
          </span>
          <p className="text-2xl font-bold text-sky-500 sm:text-3xl">
            {nba.toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">{nbaPct}%</span>
        </Link>

        <Link
          href="/collection?tag=wnba"
          className="min-w-0 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
        >
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {labels.wnba}
          </span>
          <p className="text-2xl font-bold text-orange-500 sm:text-3xl">
            {wnba.toLocaleString()}
          </p>
          <span className="text-xs text-muted-foreground">{wnbaPct}%</span>
        </Link>
      </div>

      {total > 0 && (
        <div
          className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${labels.nba} ${nbaPct}% · ${labels.wnba} ${wnbaPct}%`}
        >
          <div className="h-full bg-sky-500" style={{ width: `${nbaPct}%` }} />
          <div
            className="h-full bg-orange-500"
            style={{ width: `${wnbaPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
