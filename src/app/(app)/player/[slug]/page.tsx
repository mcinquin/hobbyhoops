import { getPlayerPageData } from "@/lib/data";
import { CardBadges } from "@/components/card-badges";
import { PlayerStatChips } from "@/components/player-stat-chips";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildCardBadgeLabels } from "@/lib/card-badge-labels";
import { getTranslations } from "@/i18n/server";

interface PlayerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  const playerName = decodeURIComponent(slug);
  const { summary, groups } = getPlayerPageData(playerName);
  const { t } = await getTranslations();
  const badgeLabels = buildCardBadgeLabels(t);

  if (!summary) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("players.notFound")}</p>
        <Link href="/player" className="text-amber-500 hover:underline mt-2 inline-block">
          {t("players.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/player"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("players.allPlayers")}
      </Link>

      <PageHeader
        title={playerName}
        subtitle={summary.team}
        actions={
          <div className="text-right">
            <p className="text-3xl font-bold text-amber-500">{summary.count}</p>
            <p className="text-xs text-muted-foreground">{t("common.cards")}</p>
          </div>
        }
      />

      <PlayerStatChips
        rookies={summary.rookies}
        autos={summary.autos}
        memos={summary.memos}
        serials={summary.serials}
      />

      <div className="space-y-6">
        {groups.map(({ groupKey, cards }) => (
          <div key={groupKey}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 border-b border-border pb-2">
              {groupKey}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-card border border-border rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {card.variation}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {card.serialNumber && (
                        <span className="text-xs font-mono text-red-400">
                          {card.serialNumber}
                        </span>
                      )}
                      {card.cardNumber && (
                        <span className="text-xs text-muted-foreground">
                          #{card.cardNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <CardBadges card={card} labels={badgeLabels} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
