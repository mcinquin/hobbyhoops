"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-validation";
import { safeInternalRedirectPath } from "@/lib/safe-redirect";
import { useTranslations } from "@/i18n/client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-mark";

interface LoginFormProps {
  /** True when no user exists yet: shows the first-account form instead of login. */
  needsBootstrap: boolean;
  /** Raw `?from=` value; sanitised before redirecting after login. */
  fromPath: string | null;
}

/** Login form, or first-account (bootstrap) form when the app has no user yet. */
export function LoginForm({ needsBootstrap, fromPath }: LoginFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : res.status >= 500
              ? t("auth.loginServerError")
              : t("auth.loginFailed")
        );
        return;
      }
      router.push(safeInternalRedirectPath(fromPath));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : res.status >= 500
              ? t("auth.bootstrapServerError")
              : t("auth.bootstrapFailed")
        );
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="text-center space-y-1 mb-6">
        <BrandMark logoHeight={64} nameClassName="text-2xl" priority />
        <p className="text-xs text-muted-foreground mt-2 leading-snug">
          {t("brand.tagline")}
        </p>
        <LanguageSwitcher className="mt-4" />
        <p className="text-sm text-muted-foreground">
          {needsBootstrap
            ? t("auth.bootstrapSubtitle")
            : t("auth.loginSubtitle")}
        </p>
      </div>

      {needsBootstrap ? (
        <form onSubmit={handleBootstrap} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t("auth.username")}</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
            <p className="text-xs text-muted-foreground">
              {t("auth.passwordMin", { min: MIN_PASSWORD_LENGTH })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password2">{t("auth.confirmPassword")}</Label>
            <Input
              id="password2"
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.createPending") : t("auth.createAccount")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t("auth.username")}</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.loginPending") : t("auth.login")}
          </Button>
        </form>
      )}
    </>
  );
}
