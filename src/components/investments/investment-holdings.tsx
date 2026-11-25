"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeDollarSign, TrendingUp, Undo2 } from "lucide-react";
import { CardDetail } from "@/components/card-detail";
import { Button } from "@/components/ui/button";
import {
  STALE_VALUATION_DAYS,
  type InvestmentHolding,
} from "@/lib/investment-portfolio";
import { cancelCardSale } from "@/lib/investments-client";
import { formatIsoDateLabel } from "@/lib/locale-date";
import { DEFAULT_CURRENCY, formatMoney } from "@/lib/money";
import type { CardListItem } from "@/lib/types";
import { useI18n, useTranslations } from "@/i18n/client";
import { GainLabel } from "./gain-label";
import { SaleDialog } from "./sale-dialog";
import { ValuationDialog } from "./valuation-dialog";

interface InvestmentHoldingsProps {
  held: InvestmentHolding[];
  sold: InvestmentHolding[];
}

type OpenDialog =
  | { kind: "detail"; card: CardListItem }
  | { kind: "valuation"; card: CardListItem; currency: string }
  | { kind: "sale"; card: CardListItem; currency: string }
  | null;

function cardSubtitle(card: CardListItem): string {
  return [card.year, card.brand, card.set, card.variation, card.grading !== "Ungraded" ? card.grading : ""]
    .filter(Boolean)
    .join(" · ");
}

/** Held and sold investment cards, with value / sale actions. */
export function InvestmentHoldings({ held, sold }: InvestmentHoldingsProps) {
  const t = useTranslations();
  const { locale } = useI18n();
  const router = useRouter();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const refresh = () => startRefresh(() => router.refresh());
  const close = () => setDialog(null);

  async function handleCancelSale(card: CardListItem) {
    if (!window.confirm(t("investments.cancelSaleConfirm"))) return;
    setError(null);
    try {
      await cancelCardSale(card.id);
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.error"));
    }
  }

  return (
    <div className="min-w-0 space-y-6" aria-busy={isRefreshing || undefined}>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <HoldingSection testId="investments-held" title={t("investments.held.title")} count={held.length}>
        {held.length === 0 ? (
          <EmptyRow label={t("investments.held.empty")} />
        ) : (
          held.map((holding) => {
            const currency = holding.currency ?? DEFAULT_CURRENCY;
            const reading = holding.latestValuation;
            return (
              <HoldingRow
                key={holding.card.id}
                holding={holding}
                onOpen={() => setDialog({ kind: "detail", card: holding.card })}
                figures={
                  <>
                    <Figure label={t("investments.columns.cost")}>
                      {formatMoney(holding.costCents, currency, locale) ?? "—"}
                    </Figure>
                    <Figure label={t("investments.columns.value")}>
                      {reading ? (
                        <>
                          {formatMoney(reading.valueCents, reading.currency, locale)}
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            {t("investments.valuedOn", {
                              date: formatIsoDateLabel(reading.valuedAt, locale),
                            })}
                            {holding.isValuationStale ? (
                              <span
                                className="ml-1 inline-flex items-center gap-0.5 text-amber-500"
                                title={t("investments.staleHint", { days: STALE_VALUATION_DAYS })}
                              >
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                {t("investments.stale")}
                              </span>
                            ) : null}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("investments.noValuation")}
                        </span>
                      )}
                    </Figure>
                    <Figure label={t("investments.columns.gain")}>
                      <GainLabel
                        cents={holding.gainCents}
                        ratio={holding.gainRatio}
                        currency={currency}
                        locale={locale}
                      />
                    </Figure>
                  </>
                }
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDialog({ kind: "valuation", card: holding.card, currency })
                      }
                    >
                      <TrendingUp />
                      {t("investments.updateValue")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialog({ kind: "sale", card: holding.card, currency })}
                    >
                      <BadgeDollarSign />
                      {t("investments.recordSale")}
                    </Button>
                  </>
                }
              />
            );
          })
        )}
      </HoldingSection>

      <HoldingSection testId="investments-sold" title={t("investments.sold.title")} count={sold.length}>
        {sold.length === 0 ? (
          <EmptyRow label={t("investments.sold.empty")} />
        ) : (
          sold.map((holding) => {
            const currency = holding.currency ?? DEFAULT_CURRENCY;
            return (
              <HoldingRow
                key={holding.card.id}
                holding={holding}
                onOpen={() => setDialog({ kind: "detail", card: holding.card })}
                figures={
                  <>
                    <Figure label={t("investments.columns.cost")}>
                      {formatMoney(holding.costCents, currency, locale) ?? "—"}
                    </Figure>
                    <Figure label={t("investments.columns.netSale")}>
                      {formatMoney(holding.netSaleCents, currency, locale) ?? "—"}
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {formatIsoDateLabel(holding.card.soldAt, locale)}
                        {holding.daysHeld != null
                          ? ` · ${t("investments.days", { count: holding.daysHeld })}`
                          : ""}
                      </span>
                    </Figure>
                    <Figure label={t("investments.columns.gain")}>
                      <GainLabel
                        cents={holding.gainCents}
                        ratio={holding.gainRatio}
                        currency={currency}
                        locale={locale}
                      />
                    </Figure>
                  </>
                }
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelSale(holding.card)}
                  >
                    <Undo2 />
                    {t("investments.cancelSale")}
                  </Button>
                }
              />
            );
          })
        )}
      </HoldingSection>

      {dialog?.kind === "detail" ? (
        <CardDetail card={dialog.card} open onClose={close} />
      ) : null}
      {dialog?.kind === "valuation" ? (
        <ValuationDialog
          card={dialog.card}
          currency={dialog.currency}
          onClose={close}
          onChanged={refresh}
        />
      ) : null}
      {dialog?.kind === "sale" ? (
        <SaleDialog
          card={dialog.card}
          currency={dialog.currency}
          onClose={close}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}

function HoldingSection({
  testId,
  title,
  count,
  children,
}: {
  testId: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-2">
      <h2 className="text-sm font-medium">
        {title} <span className="text-muted-foreground">({count})</span>
      </h2>
      <ul data-testid={testId} className="divide-y divide-border/70 rounded-lg border border-border bg-card">
        {children}
      </ul>
    </section>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <li className="px-4 py-6 text-center text-sm text-muted-foreground">{label}</li>;
}

function HoldingRow({
  holding,
  onOpen,
  figures,
  actions,
}: {
  holding: InvestmentHolding;
  onOpen: () => void;
  figures: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <li
      data-testid="investment-row"
      className="grid min-w-0 gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] lg:items-center"
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium hover:underline">
          {holding.card.player}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {cardSubtitle(holding.card)}
        </span>
      </button>
      <div className="grid min-w-0 grid-cols-3 gap-2">{figures}</div>
      <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div>
    </li>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <div className="text-sm font-medium tabular-nums">{children}</div>
    </div>
  );
}
