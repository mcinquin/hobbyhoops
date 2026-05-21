"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { cn } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-validation";
import { PageHeader } from "@/components/page-header";
import { useTranslations } from "@/i18n/client";

export default function AccountPage() {
  const router = useRouter();
  const t = useTranslations();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
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
    if (newPassword && newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("errors.passwordMin", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword && newPassword !== newPasswordConfirm) {
      setError(t("account.passwordMismatch"));
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
      setNewPasswordConfirm("");
      router.refresh();
    } catch {
      setError(t("account.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <PageHeader title={t("account.title")} subtitle={t("account.description")} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 border border-border rounded-lg p-6 bg-card"
      >
        <div className="space-y-2">
          <Label htmlFor="current">{t("account.currentPassword")}</Label>
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassConfirm">{t("account.confirmNewPassword")}</Label>
          <Input
            id="newPassConfirm"
            type="password"
            autoComplete="new-password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            placeholder={t("account.leaveEmpty")}
          />
        </div>
        <AdminFeedback
          success={message}
          error={error}
          onSuccessDismiss={() => setMessage(null)}
        />
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
