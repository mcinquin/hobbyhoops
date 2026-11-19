"use client";

import { useAdminResource } from "@/hooks/use-admin-resource";
import { cardSightStatusSchema } from "@/lib/admin-resource-schemas";
import { InfoRow, InfoSection } from "@/components/admin/admin-info-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "@/i18n/client";

/** Admin CardSight tab: API key status and monthly usage. */
export function AdminCardSightSection() {
  const t = useTranslations();
  const {
    data: status,
    loading,
    error,
    reload: loadStatus,
  } = useAdminResource(
    "/api/admin/cardsight",
    cardSightStatusSchema,
    t("admin.cardsight.loadError")
  );

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("admin.cardsight.loading")}
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => loadStatus()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (!status) return null;

  const remoteErrorMessage =
    status.errorCode === "auth"
      ? t("admin.cardsight.errorAuth")
      : status.errorCode === "quota"
        ? t("admin.cardsight.errorQuota")
        : status.errorCode === "network"
          ? t("admin.cardsight.errorNetwork")
          : null;

  const usedPercent =
    status.usage && status.monthlyQuota > 0
      ? Math.min(
          100,
          Math.round((status.usage.totalCalls / status.monthlyQuota) * 100)
        )
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("admin.cardsight.intro")}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => loadStatus()}
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin.cardsight.refresh")}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <InfoSection title={t("admin.cardsight.sections.account")}>
        <InfoRow
          label={t("admin.cardsight.configured")}
          value={
            <Badge variant={status.configured ? "secondary" : "outline"}>
              {status.configured
                ? t("admin.cardsight.configuredYes")
                : t("admin.cardsight.configuredNo")}
            </Badge>
          }
        />
        <InfoRow
          label={t("admin.cardsight.apiKey")}
          value={
            status.usage?.keyMasked ? (
              <span className="font-mono text-xs">{status.usage.keyMasked}</span>
            ) : (
              t("admin.cardsight.apiKeyUnavailable")
            )
          }
        />
        <InfoRow
          label={t("admin.cardsight.provider")}
          value="CardSight AI"
        />
        <InfoRow
          label={t("admin.cardsight.billingPeriod")}
          value={t("admin.cardsight.billingPeriodValue")}
          wide
        />
      </InfoSection>

      {!status.configured ? (
        <p className="text-sm text-muted-foreground rounded-lg border border-border bg-card p-4">
          {t("admin.cardsight.notConfiguredHint")}
        </p>
      ) : null}

      {remoteErrorMessage ? (
        <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-card p-4" role="alert">
          {remoteErrorMessage}
        </p>
      ) : null}

      {status.usage ? (
        <InfoSection title={t("admin.cardsight.sections.usage")}>
          <InfoRow
            label={t("admin.cardsight.totalCalls")}
            value={status.usage.totalCalls.toLocaleString()}
          />
          <InfoRow
            label={t("admin.cardsight.keyCalls")}
            value={
              status.usage.keyCalls != null
                ? status.usage.keyCalls.toLocaleString()
                : "—"
            }
          />
          <InfoRow
            label={t("admin.cardsight.monthlyQuota")}
            value={status.monthlyQuota.toLocaleString()}
          />
          <InfoRow
            label={t("admin.cardsight.remaining")}
            value={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="tabular-nums">
                  {status.usage.remaining.toLocaleString()}
                </span>
                {usedPercent != null ? (
                  <Badge
                    variant="outline"
                    className={
                      usedPercent >= 90
                        ? "text-amber-600 dark:text-amber-400"
                        : undefined
                    }
                  >
                    {t("admin.cardsight.usedPercent", { percent: usedPercent })}
                  </Badge>
                ) : null}
              </span>
            }
          />
          <InfoRow
            label={t("admin.cardsight.quotaNote")}
            value={t("admin.cardsight.quotaNoteValue")}
            wide
          />
        </InfoSection>
      ) : null}
    </div>
  );
}
