"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { useI18n, useTranslations } from "@/i18n/client";

interface SessionEntry {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  device: string;
  current: boolean;
}

function formatSessionDate(timestamp: number, locale: string): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

export function AdminSessionsSection() {
  const { locale } = useI18n();
  const t = useTranslations();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | "others" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reloadSessions = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/sessions", { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          sessions?: SessionEntry[];
          error?: string;
        };
        if (!active) return;
        if (!res.ok) {
          setError(
            typeof data.error === "string"
              ? data.error
              : t("admin.siteInfo.sessions.loadFailed")
          );
          setSessions([]);
          return;
        }
        setError(null);
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      })
      .catch(() => {
        if (!active) return;
        setError(t("admin.siteInfo.sessions.loadFailed"));
        setSessions([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken, t]);

  async function revokeSession(id: string) {
    setRevokingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/auth/sessions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : t("admin.siteInfo.sessions.revokeFailed")
        );
        return;
      }
      setMessage(t("admin.siteInfo.sessions.revoked"));
      reloadSessions();
    } catch {
      setError(t("admin.siteInfo.sessions.revokeFailed"));
    } finally {
      setRevokingId(null);
    }
  }

  async function revokeOtherSessions() {
    setRevokingId("others");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sessions?others=1", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : t("admin.siteInfo.sessions.revokeFailed")
        );
        return;
      }
      setMessage(t("admin.siteInfo.sessions.revokedOthers"));
      reloadSessions();
    } catch {
      setError(t("admin.siteInfo.sessions.revokeFailed"));
    } finally {
      setRevokingId(null);
    }
  }

  function deviceLabel(device: string): string {
    const key = `admin.siteInfo.sessions.device.${device}` as const;
    const label = t(key);
    return label === key ? t("admin.siteInfo.sessions.device.unknown") : label;
  }

  const hasOtherSessions = sessions.some((session) => !session.current);

  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{t("admin.siteInfo.sessions.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("admin.siteInfo.sessions.description")}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("admin.siteInfo.sessions.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="rounded-md border border-border/70 px-3 py-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">
                    {deviceLabel(session.device)}
                    {session.current ? (
                      <span className="ml-2 text-xs font-normal text-amber-500">
                        {t("admin.siteInfo.sessions.current")}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("admin.siteInfo.sessions.lastSeen", {
                      date: formatSessionDate(session.lastSeenAt, locale),
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.siteInfo.sessions.created", {
                      date: formatSessionDate(session.createdAt, locale),
                    })}
                  </p>
                </div>
                {!session.current ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokingId !== null}
                    onClick={() => void revokeSession(session.id)}
                  >
                    {revokingId === session.id
                      ? t("common.saving")
                      : t("admin.siteInfo.sessions.revoke")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasOtherSessions ? (
        <Button
          type="button"
          variant="outline"
          disabled={revokingId !== null}
          onClick={() => void revokeOtherSessions()}
        >
          {revokingId === "others"
            ? t("common.saving")
            : t("admin.siteInfo.sessions.revokeOthers")}
        </Button>
      ) : null}

      <AdminFeedback
        success={message}
        error={error}
        onSuccessDismiss={() => setMessage(null)}
      />
    </section>
  );
}
