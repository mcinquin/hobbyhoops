"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AdminCardSightStatus } from "@/lib/card-recognition/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "@/i18n/client";

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <h3 className="text-sm font-medium">{title}</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function InfoRow({
  label,
  value,
  wide,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

export function AdminCardSightSection() {
  const t = useTranslations();
  const [status, setStatus] = useState<AdminCardSightStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/cardsight", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("load");
      setStatus((await response.json()) as AdminCardSightStatus);
    } catch {
      setError(t("admin.cardsight.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/cardsight", { credentials: "include" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) throw new Error("load");
        setStatus((await response.json()) as AdminCardSightStatus);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError(t("admin.cardsight.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

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
        <Button type="button" size="sm" variant="outline" onClick={() => void loadStatus()}>
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
          onClick={() => void loadStatus()}
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
