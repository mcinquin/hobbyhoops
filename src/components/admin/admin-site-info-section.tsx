"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { SiteInfo } from "@/lib/site-info-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { AdminSessionsSection } from "@/components/admin/admin-sessions-section";
import { useI18n, useTranslations } from "@/i18n/client";

function formatBytes(bytes: number, unitLabels: { b: string; kb: string; mb: string }): string {
  if (bytes < 1024) return `${bytes} ${unitLabels.b}`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} ${unitLabels.kb}`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} ${unitLabels.mb}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDateTime(iso: string, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(iso));
}

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

function BoolBadge({
  value,
  yesLabel,
  noLabel,
}: {
  value: boolean;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <Badge variant={value ? "secondary" : "outline"}>
      {value ? yesLabel : noLabel}
    </Badge>
  );
}

export function AdminSiteInfoSection() {
  const t = useTranslations();
  const { locale } = useI18n();
  const [info, setInfo] = useState<SiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/site-info", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("load");
      setInfo((await response.json()) as SiteInfo);
    } catch {
      setError(t("admin.siteInfo.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/site-info", { credentials: "include" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) throw new Error("load");
        const data = (await response.json()) as SiteInfo;
        setInfo(data);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError(t("admin.siteInfo.loadError"));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  const unitLabels = {
    b: t("admin.siteInfo.bytes"),
    kb: t("admin.siteInfo.kilobytes"),
    mb: t("admin.siteInfo.megabytes"),
  };

  if (loading && !info) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("admin.siteInfo.loading")}
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void loadInfo()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (!info) return null;

  const localeTag = locale === "fr" ? "fr-FR" : "en-US";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("admin.siteInfo.intro")}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void loadInfo()}
        >
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin.siteInfo.refresh")}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <InfoSection title={t("admin.siteInfo.sections.application")}>
        <InfoRow label={t("admin.siteInfo.appVersion")} value={info.app.version} />
        <InfoRow label={t("admin.siteInfo.nodeVersion")} value={info.app.nodeVersion} />
        <InfoRow label={t("admin.siteInfo.nodeEnv")} value={info.app.nodeEnv} />
        <InfoRow label={t("admin.siteInfo.platform")} value={info.app.platform} />
        <InfoRow
          label={t("admin.siteInfo.uptime")}
          value={formatUptime(info.app.uptimeSeconds)}
        />
        <InfoRow
          label={t("admin.siteInfo.generatedAt")}
          value={formatDateTime(info.generatedAt, localeTag)}
        />
      </InfoSection>

      <InfoSection title={t("admin.siteInfo.sections.runtime")}>
        <InfoRow
          label={t("admin.siteInfo.trustProxy")}
          value={
            <BoolBadge
              value={info.runtime.trustProxy}
              yesLabel={t("admin.siteInfo.enabled")}
              noLabel={t("admin.siteInfo.disabled")}
            />
          }
        />
        <InfoRow
          label={t("admin.siteInfo.cookieSecure")}
          value={
            <BoolBadge
              value={info.runtime.cookieSecure}
              yesLabel={t("admin.siteInfo.enabled")}
              noLabel={t("admin.siteInfo.disabled")}
            />
          }
        />
      </InfoSection>

      <InfoSection title={t("admin.siteInfo.sections.database")}>
        <InfoRow label={t("admin.siteInfo.dbPath")} value={info.database.displayPath} />
        <InfoRow
          label={t("admin.siteInfo.dbSize")}
          value={formatBytes(info.database.sizeBytes, unitLabels)}
        />
        <InfoRow
          label={t("admin.siteInfo.schemaVersion")}
          value={
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="font-mono tabular-nums">
                {info.database.schemaVersion} / {info.database.expectedSchemaVersion}
              </span>
              <Badge
                variant={info.database.schemaUpToDate ? "secondary" : "outline"}
                className={
                  info.database.schemaUpToDate
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }
              >
                {info.database.schemaUpToDate
                  ? t("admin.siteInfo.schemaOk")
                  : t("admin.siteInfo.schemaPending")}
              </Badge>
            </span>
          }
          wide
        />
        <InfoRow
          label={t("admin.siteInfo.dbHealth")}
          value={
            <BoolBadge
              value={info.database.healthOk}
              yesLabel={t("admin.siteInfo.healthy")}
              noLabel={t("admin.siteInfo.unhealthy")}
            />
          }
        />
        <InfoRow label={t("admin.siteInfo.journalMode")} value={info.database.journalMode} />
        <InfoRow
          label={t("admin.siteInfo.dbPages")}
          value={`${info.database.pageCount.toLocaleString()} × ${info.database.pageSize} B`}
        />
        <InfoRow
          label={t("admin.siteInfo.foreignKeys")}
          value={
            <BoolBadge
              value={info.database.foreignKeys}
              yesLabel={t("admin.siteInfo.enabled")}
              noLabel={t("admin.siteInfo.disabled")}
            />
          }
        />
      </InfoSection>

      <InfoSection title={t("admin.siteInfo.sections.auth")}>
        <InfoRow label={t("admin.siteInfo.users")} value={info.auth.users} />
        <InfoRow label={t("admin.siteInfo.activeSessions")} value={info.auth.activeSessions} />
      </InfoSection>

      <AdminSessionsSection />
    </div>
  );
}
