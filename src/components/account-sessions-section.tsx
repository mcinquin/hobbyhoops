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

export function AccountSessionsSection() {
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
              : t("account.sessions.loadFailed")
          );
          setSessions([]);
          return;
        }
        setError(null);
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      })
      .catch(() => {
        if (!active) return;
        setError(t("account.sessions.loadFailed"));
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
            : t("account.sessions.revokeFailed")
        );
        return;
      }
      setMessage(t("account.sessions.revoked"));
      reloadSessions();
    } catch {
      setError(t("account.sessions.revokeFailed"));
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
            : t("account.sessions.revokeFailed")
        );
        return;
      }
      setMessage(t("account.sessions.revokedOthers"));
      reloadSessions();
    } catch {
      setError(t("account.sessions.revokeFailed"));
    } finally {
      setRevokingId(null);
    }
  }

  function deviceLabel(device: string): string {
    const key = `account.sessions.device.${device}` as const;
    const label = t(key);
    return label === key ? t("account.sessions.device.unknown") : label;
  }

  const hasOtherSessions = sessions.some((session) => !session.current);

  return (
    <section className="space-y-4 max-w-md border border-border rounded-lg p-6 bg-card">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("account.sessions.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("account.sessions.description")}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("account.sessions.empty")}
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
                        {t("account.sessions.current")}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("account.sessions.lastSeen", {
                      date: formatSessionDate(session.lastSeenAt, locale),
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("account.sessions.created", {
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
                      : t("account.sessions.revoke")}
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
            : t("account.sessions.revokeOthers")}
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
