"use client";

import { useTranslations } from "@/i18n/client";

interface PlayerStatChipsProps {
  rookies: number;
  autos: number;
  memos: number;
  serials: number;
  /** Libellés courts (liste joueurs) ou longs (fiche joueur). */
  variant?: "short" | "long";
}

export function PlayerStatChips({
  rookies,
  autos,
  memos,
  serials,
  variant = "long",
}: PlayerStatChipsProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {rookies > 0 && (
        <span className="text-emerald-500">
          {variant === "short"
            ? `${rookies} ${t("badges.rookie")}`
            : t("players.rookies", { count: rookies })}
        </span>
      )}
      {autos > 0 && (
        <span className="text-amber-500">
          {variant === "short"
            ? `${autos} ${t("badges.autograph")}`
            : t("players.autographs", { count: autos })}
        </span>
      )}
      {memos > 0 && (
        <span className="text-blue-500">
          {variant === "short"
            ? `${memos} ${t("badges.memorabilia")}`
            : t("players.memorabilia", { count: memos })}
        </span>
      )}
      {serials > 0 && (
        <span className="text-red-500">
          {variant === "short"
            ? t("players.serialsShort", { count: serials })
            : t("players.numbered", { count: serials })}
        </span>
      )}
    </div>
  );
}
