import { getCollection } from "@/lib/data";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getTranslations } from "@/i18n/server";

export default async function PlayersPage() {
  const cards = getCollection();
  const { t } = await getTranslations();

  const playerStats = cards.reduce(
    (acc, card) => {
      if (!card.player) return acc;
      if (!acc[card.player]) {
        acc[card.player] = {
          name: card.player,
          team: card.team,
          count: 0,
          autos: 0,
          memos: 0,
          serials: 0,
          rookies: 0,
        };
      }
      acc[card.player].count++;
      if (card.autograph) acc[card.player].autos++;
      if (card.memorabilia) acc[card.player].memos++;
      if (card.serialNumber) acc[card.player].serials++;
      if (card.rookie) acc[card.player].rookies++;
      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        team: string;
        count: number;
        autos: number;
        memos: number;
        serials: number;
        rookies: number;
      }
    >
  );

  const players = Object.values(playerStats).sort((a, b) => b.count - a.count);

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
            <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
              {player.rookies > 0 && (
                <span className="text-emerald-500">
                  {player.rookies} {t("badges.rookie")}
                </span>
              )}
              {player.autos > 0 && (
                <span className="text-amber-500">
                  {player.autos} {t("badges.autograph")}
                </span>
              )}
              {player.memos > 0 && (
                <span className="text-blue-500">
                  {player.memos} {t("badges.memorabilia")}
                </span>
              )}
              {player.serials > 0 && (
                <span className="text-red-500">
                  {t("players.serialsShort", { count: player.serials })}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
