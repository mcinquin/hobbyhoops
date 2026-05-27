import { PlayerStatChips } from "@/components/player-stat-chips";
import { getPlayerSummaries } from "@/lib/data";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getTranslations } from "@/i18n/server";

export default async function PlayersPage() {
  const players = getPlayerSummaries();
  const { t } = await getTranslations();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("players.title")}
        subtitle={t("players.count", { count: players.length })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player) => (
          <Link
            key={player.name}
            href={`/player/${encodeURIComponent(player.name)}`}
            className="bg-card border border-border rounded-lg p-4 hover:border-amber-500/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{player.name}</h3>
                <p className="text-xs text-muted-foreground">{player.team}</p>
              </div>
              <span className="text-2xl font-bold text-amber-500">
                {player.count}
              </span>
            </div>
            <div className="mt-3">
              <PlayerStatChips
                rookies={player.rookies}
                autos={player.autos}
                memos={player.memos}
                serials={player.serials}
                variant="short"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
