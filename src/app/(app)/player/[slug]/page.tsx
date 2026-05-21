import { getCollection } from "@/lib/data";
import { CardBadges } from "@/components/card-badges";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "@/i18n/server";

interface PlayerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  const playerName = decodeURIComponent(slug);
  const allCards = getCollection();
  const cards = allCards.filter((c) => c.player === playerName);
  const { t } = await getTranslations();
  const badgeLabels = {
    rookie: t("badges.rookie"),
    autograph: t("badges.autograph"),
    memorabilia: t("badges.memorabilia"),
    numbered: t("badges.numbered"),
    tradable: t("badges.tradable"),
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t("players.notFound")}</p>
        <Link href="/player" className="text-amber-500 hover:underline mt-2 inline-block">
          {t("players.backToList")}
        </Link>
      </div>
    );
  }

  const team = cards[0].team;
  const autos = cards.filter((c) => c.autograph).length;
  const memos = cards.filter((c) => c.memorabilia).length;
  const serials = cards.filter((c) => c.serialNumber).length;
  const rookies = cards.filter((c) => c.rookie).length;

  const bySet = cards.reduce(
    (acc, card) => {
      const key = `${card.year} ${card.brand} ${card.set}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(card);
      return acc;
    },
    {} as Record<string, typeof cards>
  );

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
        subtitle={team}
        actions={
          <div className="text-right">
            <p className="text-3xl font-bold text-amber-500">{cards.length}</p>
            <p className="text-xs text-muted-foreground">{t("common.cards")}</p>
          </div>
        }
      />

      <div className="flex gap-4 text-sm">
        {rookies > 0 && (
          <span className="text-emerald-500">
            {t("players.rookies", { count: rookies })}
          </span>
        )}
        {autos > 0 && (
          <span className="text-amber-500">
            {t("players.autographs", { count: autos })}
          </span>
        )}
        {memos > 0 && (
          <span className="text-blue-500">
            {t("players.memorabilia", { count: memos })}
          </span>
        )}
        {serials > 0 && (
          <span className="text-red-500">
            {t("players.numbered", { count: serials })}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(bySet)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([setName, setCards]) => (
            <div key={setName}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 border-b border-border pb-2">
                {setName}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {setCards.map((card) => (
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
