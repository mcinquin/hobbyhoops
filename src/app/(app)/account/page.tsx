"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-validation";
import { useTranslations } from "@/i18n/client";

export default function AccountPage() {
  const router = useRouter();
  const t = useTranslations();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!currentPassword) {
      setError(t("account.currentRequired"));
      return;
    }
    if (!newUsername.trim() && !newPassword) {
      setError(t("account.changeRequired"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim() || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : t("account.updateFailed")
        );
        return;
      }
      setMessage(t("account.updated"));
      setCurrentPassword("");
      setNewUsername("");
      setNewPassword("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("account.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("account.description")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border border-border rounded-lg p-6 bg-card">
        <div className="space-y-2">
          <Label htmlFor="current">{t("account.currentPassword")}</Label>
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newUser">{t("account.newUsername")}</Label>
          <Input
            id="newUser"
            autoComplete="username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder={t("account.leaveEmpty")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPass">{t("account.newPassword")}</Label>
          <Input
            id="newPass"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("account.passwordMin", { min: MIN_PASSWORD_LENGTH })}
            minLength={MIN_PASSWORD_LENGTH}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-emerald-500" role="status">
            {message}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? t("common.saving") : t("common.save")}
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex text-center"
            )}
          >
            {t("common.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}
