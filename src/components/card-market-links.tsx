import type { CardListItem } from "@/lib/types";
import { buildCardMarketLinks, type MarketPlatformId } from "@/lib/card-sales-links";
import { useTranslations } from "@/i18n/client";

const PLATFORM_LABEL_KEYS: Record<MarketPlatformId, string> = {
  ebay: "common.ebay",
  point130: "common.point130",
  cardladder: "common.cardLadder",
  comc: "common.comc",
};

interface CardMarketLinksProps {
  card: CardListItem;
  className?: string;
}

export function CardMarketLinks({ card, className }: CardMarketLinksProps) {
  const t = useTranslations();
  const links = buildCardMarketLinks(card);

  return (
    <p className={className ?? "text-xs text-muted-foreground"}>
      <span>{t("cards.marketLinks")} </span>
      {links.map((link, index) => (
        <span key={link.id}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:underline"
          >
            {t(PLATFORM_LABEL_KEYS[link.id])}
          </a>
        </span>
      ))}
    </p>
  );
}
